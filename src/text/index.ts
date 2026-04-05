/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */
import cssColorParse from 'parse-css-color';
import type { LayoutContext } from '../layout.js';
import type { GlyphBox } from '../font.js';

import buildDecoration from '../builder/text-decoration.js';
import buildText, { container } from '../builder/text.js';
import { buildDropShadow } from '../builder/shadow.js';
import { getYoga, TYoga, YogaNode } from '../yoga.js';
import { HorizontalEllipsis, Space, Tab } from './characters.js';
import { Locale } from '../language.js';
import { genMeasurer } from './measurer.js';
import { preprocess } from './processor.js';
import {
	v,
	segment,
	wordSeparators,
	buildXMLString,
	isUndefined,
	isString,
	lengthToNumber
} from '../utils.js';

const skippedWordWhenFindingMissingFont = new Set([Tab]);

const shouldSkipWhenFindingMissingFont = (word: string): boolean => {
	return skippedWordWhenFindingMissingFont.has(word);
};

const isFullyTransparent = (color: string): boolean => {
	if (color === 'transparent') {
		return true;
	}
	const parsed = cssColorParse(color);
	return parsed ? parsed.alpha === 0 : false;
};

const isOpaqueWhite = (color: string): boolean => {
	if (!color) {
		return false;
	}
	const parsed = cssColorParse(color);
	if (!parsed) {
		return false;
	}
	const [r, g, b, a] = parsed.values;
	return r === 255 && g === 255 && b === 255 && (a === undefined || a === 1);
};

const createTextContainerNode = (Yoga: TYoga, textAlign: string): YogaNode => {
	// Create a container node for this text fragment.
	const textContainer = Yoga.Node.create();
	textContainer.setAlignItems(Yoga.ALIGN_BASELINE);
	textContainer.setJustifyContent(
		v(
			textAlign,
			{
				left: Yoga.JUSTIFY_FLEX_START,
				right: Yoga.JUSTIFY_FLEX_END,
				center: Yoga.JUSTIFY_CENTER,
				justify: Yoga.JUSTIFY_SPACE_BETWEEN,
				// We don't have other writing modes yet.
				start: Yoga.JUSTIFY_FLEX_START,
				end: Yoga.JUSTIFY_FLEX_END
			},
			Yoga.JUSTIFY_FLEX_START,
			'textAlign'
		)
	);

	return textContainer;
};

const detectTabs = (
	text: string
):
	| {
			index: null;
			tabCount: 0;
	  }
	| {
			index: number;
			tabCount: number;
	  } => {
	const result = /(\t)+/.exec(text);
	return result
		? {
				index: result.index,
				tabCount: result[0].length
		  }
		: {
				index: null,
				tabCount: 0
		  };
};

const buildTextNodes = async function* (
	content: string,
	context: LayoutContext
): AsyncGenerator<{ word: string; locale?: Locale }[], string, [any, any]> {
	const Yoga = await getYoga();

	const {
		parentStyle,
		inheritedStyle,
		parent,
		font,
		id,
		isInheritingTransform,
		debug,
		embedFont,
		graphemeImages,
		locale,
		canLoadAdditionalAssets
	} = context;

	const {
		textAlign,
		textIndent = 0,
		lineHeight,
		textWrap,
		fontSize,
		filter: cssFilter,
		tabSize = 8,
		letterSpacing,
		_inheritedBackgroundClipTextPath,
		_inheritedBackgroundClipTextHasBackground,
		flexShrink
	} = parentStyle;

	const {
		words,
		requiredBreaks,
		allowSoftWrap,
		allowBreakWord,
		processedContent,
		shouldCollapseTabsAndSpaces,
		lineLimit,
		blockEllipsis
	} = preprocess(content, parentStyle, locale);

	const textContainer = createTextContainerNode(Yoga, textAlign);
	parent.insertChild(textContainer, parent.getChildCount());

	if (isUndefined(flexShrink)) {
		parent.setFlexShrink(1);
	}

	// Get the correct font according to the container style.
	// https://www.w3.org/TR/CSS2/visudet.html
	let engine = font.getEngine(fontSize, lineHeight, parentStyle, locale);

	// Yield segments that are missing a font.
	const wordsMissingFont = canLoadAdditionalAssets
		? segment(processedContent, 'grapheme').filter(word => {
				return (
					!shouldSkipWhenFindingMissingFont(word) && !engine.has(word)
				);
		  })
		: [];

	yield wordsMissingFont.map(word => {
		return {
			locale,
			word
		};
	});

	if (wordsMissingFont.length) {
		// Reload the engine with additional fonts.
		engine = font.getEngine(fontSize, lineHeight, parentStyle, locale);
	}

	const isImage = (s: string): boolean => {
		return !!(graphemeImages && graphemeImages[s]);
	};

	const { measureGrapheme, measureGraphemeArray, measureText } = genMeasurer(
		engine,
		isImage,
		{
			fontSize,
			letterSpacing
		}
	);

	const tabWidth = isString(tabSize)
		? lengthToNumber(tabSize, fontSize, 1, parentStyle)
		: measureGrapheme(Space) * tabSize;

	const calc = (
		text: string,
		currentWidth: number
	): {
		originWidth: number;
		endingSpacesWidth: number;
		text: string;
	} => {
		if (text.length === 0) {
			return {
				endingSpacesWidth: 0,
				originWidth: 0,
				text
			};
		}

		const { index, tabCount } = detectTabs(text);

		let originWidth = 0;

		if (tabCount > 0) {
			const textBeforeTab = text.slice(0, index);
			const textAfterTab = text.slice(index + tabCount);
			const textWidthBeforeTab = measureText(textBeforeTab);
			const offsetBeforeTab = textWidthBeforeTab + currentWidth;
			const tabMoveDistance =
				tabWidth === 0
					? textWidthBeforeTab
					: (Math.floor(offsetBeforeTab / tabWidth) + tabCount) *
					  tabWidth;
			originWidth = tabMoveDistance + measureText(textAfterTab);
		} else {
			originWidth = measureText(text);
		}

		const afterTrimEndWidth =
			text.trimEnd() === text ? originWidth : measureText(text.trimEnd());

		return {
			endingSpacesWidth: originWidth - afterTrimEndWidth,
			originWidth,
			text
		};
	};

	// Global variables used to compute the text layout.
	// @TODO: Use segments instead of words to properly support kerning.
	let lineWidths = [];
	let baselines = [];
	let lineSegmentNumber = [];
	let texts: string[] = [];
	let wordPositionInLayout: (null | {
		x: number;
		y: number;
		width: number;
		line: number;
		lineIndex: number;
		isImage: boolean;
	})[] = [];

	// With the given container width, compute the text layout.
	const flow = (width: number) => {
		let lines = 0;
		let maxWidth = 0;
		let lineIndex = -1;
		let height = 0;
		let currentWidth = 0;
		let currentLineHeight = 0;
		let currentBaselineOffset = 0;

		lineWidths = [];
		lineSegmentNumber = [0];
		texts = [];
		wordPositionInLayout = [];

		// We naively implement the width calculation without proper kerning.
		// @TODO: Support different writing modes.
		// @TODO: Support RTL languages.
		let i = 0;
		let prevLineEndingSpacesWidth = 0;
		while (i < words.length && lines < lineLimit) {
			let word = words[i];
			const forceBreak = requiredBreaks[i];

			let w = 0;

			const {
				originWidth,
				endingSpacesWidth,
				text: _word
			} = calc(word, currentWidth);
			word = _word;

			w = originWidth;
			const lineEndingSpacesWidth = endingSpacesWidth;

			// When starting a new line from an empty line, we should push one extra
			// line height.
			if (forceBreak && currentLineHeight === 0) {
				currentLineHeight = engine.height(word);
			}

			const allowedToJustify = textAlign === 'justify';

			const willWrap =
				i &&
				// When determining whether a line break is necessary, the width of the
				// trailing spaces is not included in the calculation, as the end boundary
				// can be closely adjacent to the last non-space character.
				// e.g.
				// 'aaa bbb ccc'
				// When the break line happens at the end of the `bbb`, what we see looks like this
				// |aaa bbb|
				// |ccc    |
				currentWidth + w > width + lineEndingSpacesWidth &&
				allowSoftWrap;

			// Need to break the word if:
			// - we have break-word
			// - the word is wider than the container width
			// - the word will be put at the beginning of the line
			const needToBreakWord =
				allowBreakWord &&
				w > width &&
				(!currentWidth || willWrap || forceBreak);

			if (needToBreakWord) {
				// Break the word into multiple segments and continue the loop.
				const chars = segment(word, 'grapheme');
				words.splice(i, 1, ...chars);
				if (currentWidth > 0) {
					// Start a new line, spaces can be ignored.
					lineWidths.push(currentWidth - prevLineEndingSpacesWidth);
					baselines.push(currentBaselineOffset);
					lines++;
					height += currentLineHeight;
					currentWidth = 0;
					currentLineHeight = 0;
					currentBaselineOffset = 0;
					lineSegmentNumber.push(1);
					lineIndex = -1;
				}
				prevLineEndingSpacesWidth = lineEndingSpacesWidth;
				continue;
			}
			if (forceBreak || willWrap) {
				// Start a new line, spaces can be ignored.
				if (shouldCollapseTabsAndSpaces && word === Space) {
					w = 0;
				}

				lineWidths.push(currentWidth - prevLineEndingSpacesWidth);
				baselines.push(currentBaselineOffset);
				lines++;
				height += currentLineHeight;
				currentWidth = w;
				currentLineHeight = w ? Math.round(engine.height(word)) : 0;
				currentBaselineOffset = w
					? Math.round(engine.baseline(word))
					: 0;
				lineSegmentNumber.push(1);
				lineIndex = -1;

				// If it's naturally broken, we update the max width.
				// Since if there are multiple lines, the width should fit the
				// container.
				if (!forceBreak) {
					maxWidth = Math.max(maxWidth, width);
				}
			} else {
				// It fits into the current line.
				currentWidth += w;
				const glyphHeight = Math.round(engine.height(word));
				if (glyphHeight > currentLineHeight) {
					// Use the baseline of the highest segment as the baseline of the line.
					currentLineHeight = glyphHeight;
					currentBaselineOffset = Math.round(engine.baseline(word));
				}
				if (allowedToJustify) {
					lineSegmentNumber[lineSegmentNumber.length - 1]++;
				}
			}

			if (allowedToJustify) {
				lineIndex++;
			}

			maxWidth = Math.max(maxWidth, currentWidth);

			let x = currentWidth - w;

			if (w === 0) {
				wordPositionInLayout.push({
					isImage: false,
					line: lines,
					lineIndex,
					width: 0,
					x,
					y: height
				});
			} else {
				const _texts = segment(word, 'word');

				for (let j = 0; j < _texts.length; j++) {
					const _text = _texts[j];
					let _width = 0;
					let _isImage = false;

					if (isImage(_text)) {
						_width = fontSize;
						_isImage = true;
					} else if (!embedFont && _text.length > 1) {
						// When embedFont is false, use measureText for multi-character strings
						// to ensure consistency with how currentWidth is accumulated (sum of
						// grapheme widths). measureGrapheme uses getAdvanceWidth which includes
						// kerning, causing position mismatches between consecutive <text> elements.
						_width = measureText(_text);
					} else {
						_width = measureGrapheme(_text);
					}

					texts.push(_text);
					wordPositionInLayout.push({
						isImage: _isImage,
						line: lines,
						lineIndex,
						width: _width,
						x,
						y: height
					});

					x += _width;
				}
			}

			i++;
			prevLineEndingSpacesWidth = lineEndingSpacesWidth;
		}

		if (currentWidth) {
			if (lines < lineLimit) {
				height += currentLineHeight;
			}
			lines++;
			lineWidths.push(currentWidth);
			baselines.push(currentBaselineOffset);
		}

		// @TODO: Support `line-height`.
		return { height, width: maxWidth };
	};

	// It's possible that the text's measured size is different from the container's
	// size, because the container might have a fixed width or height or being
	// expanded by its parent.
	let measuredTextSize = { height: 0, width: 0 };
	textContainer.setMeasureFunc(containerWidth => {
		const { width, height } = flow(containerWidth);

		// When doing `text-wrap: balance`, we reflow the text multiple times
		// using binary search to find the best width.
		// https://www.w3.org/TR/css-text-4/#valdef-text-wrap-balance
		if (textWrap === 'balance') {
			let l = width / 2;
			let r = width;
			let m: number = width;
			while (l + 1 < r) {
				m = (l + r) / 2;
				const { height: mHeight } = flow(m);
				if (mHeight > height) {
					l = m;
				} else {
					r = m;
				}
			}
			flow(r);
			const _width = Math.ceil(r);
			measuredTextSize = { height, width: _width };
			return { height, width: _width };
		}

		// When doing `text-wrap: pretty`, we try to avoid ending a paragraph with a single word
		// by reshaping all lines in a way that achieves more balanced line lengths
		// This "pretty" line breaking algorithm tries to achieve optimal line breaks
		// that avoid orphans (single words at the end of a paragraph) and create
		// visually pleasing line lengths.
		if (textWrap === 'pretty') {
			// Check if the last line has a single word or is very short
			// (typically less than 1/3 of the container width)
			const lastLineWidth = lineWidths[lineWidths.length - 1];
			const isLastLineShort = lastLineWidth < width / 3;

			if (isLastLineShort) {
				// Reflow the paragraph with slightly adjusted line breaks
				// to avoid orphans and create more even line lengths
				// This is a simplified approach - a real implementation would use a
				// more sophisticated algorithm to find optimal line breaks

				// We'll just reflow once with slightly reduced width to force
				// redistribution of words. This is much simplified from the actual
				// paragraph-level line breaking algorithm which would compute scores
				// for different line break combinations.
				const adjustedWidth = width * 0.9;
				const result = flow(adjustedWidth);

				// Use the result if it reduces orphans without adding too many lines
				if (result.height <= height * 1.3) {
					measuredTextSize = { height: result.height, width };
					return { height: result.height, width };
				}
			}
		}

		const _width = Math.ceil(width);
		measuredTextSize = { height, width: _width };
		// This may be a temporary fix, I didn't dig deep into yoga.
		// But when the return value of width here doesn't change (assuming the value of width is 216.9),
		// when we later get the width through `parent.getComputedWidth()`, sometimes it returns 216 and sometimes 217.
		// I'm not sure if this is a yoga bug, but it seems related to the entire page width.
		// So I use Math.ceil.
		return { height, width: _width };
	});

	const [x, y] = yield;

	let result = '';
	let backgroundClipDef = '';

	const clipPathId = inheritedStyle._inheritedClipPathId as
		| string
		| undefined;
	const overflowMaskId = inheritedStyle._inheritedMaskId as
		| number
		| undefined;

	const {
		left: containerLeft,
		top: containerTop,
		width: containerWidth,
		height: containerHeight
	} = textContainer.getComputedLayout();

	// Convert textIndent to number if it's a string (e.g., percentage)
	const textIndentNumber =
		typeof textIndent === 'string'
			? lengthToNumber(
					textIndent,
					fontSize,
					containerWidth,
					parentStyle,
					true
			  ) || 0
			: textIndent;

	const parentContainerInnerWidth =
		parent.getComputedWidth() -
		parent.getComputedPadding(Yoga.EDGE_LEFT) -
		parent.getComputedPadding(Yoga.EDGE_RIGHT) -
		parent.getComputedBorder(Yoga.EDGE_LEFT) -
		parent.getComputedBorder(Yoga.EDGE_RIGHT);

	// Attach offset to the current node.
	const left = x + containerLeft;
	const top = y + containerTop;

	const { matrix, opacity } = container(
		{
			left: containerLeft,
			top: containerTop,
			width: containerWidth,
			height: containerHeight,
			isInheritingTransform
		},
		parentStyle
	);

	let filter = '';
	if (parentStyle.textShadowOffset) {
		const { textShadowColor, textShadowOffset, textShadowRadius } =
			parentStyle;

		// Expand filter region to account for stroke extending beyond text bounds.
		const webkitStrokeW = Number(inheritedStyle.WebkitTextStrokeWidth) || 0;
		const fauxBoldW = engine.fauxBoldStrokeWidth || 0;
		const strokePadding =
			Math.max(webkitStrokeW + fauxBoldW, webkitStrokeW, fauxBoldW) / 2;

		filter = buildDropShadow(
			{
				height: measuredTextSize.height,
				id,
				padding: strokePadding,
				width: measuredTextSize.width
			},
			{
				shadowColor: textShadowColor,
				shadowOffset: textShadowOffset,
				shadowRadius: textShadowRadius
			},
			isFullyTransparent(parentStyle.color) ||
				(_inheritedBackgroundClipTextHasBackground &&
					isOpaqueWhite(parentStyle.color))
		);

		filter = buildXMLString('defs', {}, filter);
	}

	let decorationShape = '';
	let mergedPath = '';
	let extra = '';
	let skippedLine = -1;
	type DecorationLine = {
		ascender: number;
		left: number;
		top: number;
		width: number;
	};
	let decorationLines: Record<number, DecorationLine | null> = {};
	let decorationGlyphs: Record<number, GlyphBox[]> = {};
	let wordBuffer: string | null = null;
	let bufferedOffset = 0;

	for (let i = 0; i < texts.length; i++) {
		// Skip whitespace and empty characters.
		const layout = wordPositionInLayout[i];
		const nextLayout = wordPositionInLayout[i + 1];

		if (!layout) {
			continue;
		}

		let text = texts[i];
		let path: string | null = null;
		let isLastDisplayedBeforeEllipsis = false;

		const image = graphemeImages ? graphemeImages[text] : null;

		let topOffset = layout.y;
		let leftOffset = layout.x;
		const width = layout.width;
		const line = layout.line;
		const shouldCollectDecorationBoxes =
			parentStyle.textDecorationLine === 'underline' &&
			(parentStyle.textDecorationSkipInk || 'auto') !== 'none';

		if (line === skippedLine) {
			continue;
		}

		// When `text-align` is `justify`, the width of the line will be adjusted.
		let extendedWidth = false;

		// Apply text-indent to the first line (for both single and multi-line text)
		if (line === 0 && textIndentNumber !== 0) {
			leftOffset += textIndentNumber;
		}

		if (lineWidths.length > 1) {
			// Calculate alignment. Note that for Flexbox, there is only text
			// alignment when the container is multi-line.
			const remainingWidth = containerWidth - lineWidths[line];
			if (textAlign === 'right' || textAlign === 'end') {
				leftOffset += remainingWidth;
			} else if (textAlign === 'center') {
				leftOffset += remainingWidth / 2;
			} else if (textAlign === 'justify') {
				// Don't justify the last line.
				if (line < lineWidths.length - 1) {
					const segments = lineSegmentNumber[line];
					const gutter =
						segments > 1 ? remainingWidth / (segments - 1) : 0;
					leftOffset += gutter * layout.lineIndex;
					extendedWidth = true;
				}
			}

			// Only round for embedded fonts (paths benefit from pixel alignment).
			// For non-embedded fonts (<text> elements), keep fractional positions
			// to maintain consistent spacing between consecutive elements.
			if (embedFont) {
				leftOffset = Math.round(leftOffset);
			}
		}

		const baselineOfLine = baselines[line];
		const baselineOfWord = engine.baseline(text);
		const heightOfWord = engine.height(text);
		const baselineDelta = baselineOfLine - baselineOfWord;

		const buildUnderlineBand = (offset: number) => {
			if (
				!shouldCollectDecorationBoxes ||
				parentStyle.textDecorationLine !== 'underline'
			) {
				return undefined;
			}
			const baseline = top + offset + baselineDelta + baselineOfWord;
			return {
				strokeWidth: Math.max(1, fontSize * 0.1),
				underlineY: baseline + baselineOfWord * 0.1
			};
		};

		if (!decorationLines[line]) {
			decorationLines[line] = {
				ascender: baselineOfWord,
				left: leftOffset,
				top: top + topOffset + baselineDelta,
				width: extendedWidth ? containerWidth : lineWidths[line]
			};
		}

		if (lineLimit !== Infinity) {
			let _blockEllipsis = blockEllipsis;
			let ellipsisWidth = measureGrapheme(blockEllipsis);
			if (ellipsisWidth > parentContainerInnerWidth) {
				_blockEllipsis = HorizontalEllipsis;
				ellipsisWidth = measureGrapheme(_blockEllipsis);
			}
			const spaceWidth = measureGrapheme(Space);
			const isNotLastLine = line < lineWidths.length - 1;
			const isLastAllowedLine = line + 1 === lineLimit;

			const calcEllipsis = (baseWidth: number, _text: string) => {
				const chars = segment(_text, 'grapheme', locale);

				let subset = '';
				let resolvedWidth = 0;

				for (const char of chars) {
					const w = baseWidth + measureGraphemeArray([subset + char]);
					if (
						// Keep at least one character:
						// > The first character or atomic inline-level element on a line
						// must be clipped rather than ellipsed.
						// https://drafts.csswg.org/css-overflow/#text-overflow
						subset &&
						w + ellipsisWidth > parentContainerInnerWidth
					) {
						break;
					}
					subset += char;
					resolvedWidth = w;
				}

				return {
					resolvedWidth,
					subset
				};
			};

			if (
				isLastAllowedLine &&
				(isNotLastLine || lineWidths[line] > parentContainerInnerWidth)
			) {
				if (
					leftOffset + width + ellipsisWidth + spaceWidth >
					parentContainerInnerWidth
				) {
					const { subset, resolvedWidth } = calcEllipsis(
						leftOffset,
						text
					);

					text = subset + _blockEllipsis;
					skippedLine = line;
					decorationLines[line].width = Math.max(
						0,
						resolvedWidth - decorationLines[line].left
					);
					isLastDisplayedBeforeEllipsis = true;
				} else if (nextLayout && nextLayout.line !== line) {
					if (textAlign === 'center') {
						const { subset, resolvedWidth } = calcEllipsis(
							leftOffset,
							text
						);

						text = subset + _blockEllipsis;
						skippedLine = line;
						decorationLines[line].width = Math.max(
							0,
							resolvedWidth - decorationLines[line].left
						);
						isLastDisplayedBeforeEllipsis = true;
					} else {
						const nextLineText = texts[i + 1];

						const { subset, resolvedWidth } = calcEllipsis(
							width + leftOffset,
							nextLineText
						);

						text = text + subset + _blockEllipsis;
						skippedLine = line;
						decorationLines[line].width = Math.max(
							0,
							resolvedWidth - decorationLines[line].left
						);
						isLastDisplayedBeforeEllipsis = true;
					}
				}
			}
		}

		if (image) {
			// For images, we remove the baseline offset.
			topOffset += 0;
		} else if (embedFont) {
			// If the current word and the next word are on the same line, we try to
			// merge them together to better handle the kerning.
			if (
				!text.includes(Tab) &&
				!wordSeparators.includes(text) &&
				texts[i + 1] &&
				nextLayout &&
				!nextLayout.isImage &&
				topOffset === nextLayout.y &&
				!isLastDisplayedBeforeEllipsis
			) {
				if (wordBuffer === null) {
					bufferedOffset = leftOffset;
				}
				wordBuffer = wordBuffer === null ? text : wordBuffer + text;
				continue;
			}

			const finalizedSegment =
				wordBuffer === null ? text : wordBuffer + text;
			const finalizedLeftOffset =
				wordBuffer === null ? leftOffset : bufferedOffset;
			const finalizedWidth =
				layout.width + leftOffset - finalizedLeftOffset;

			const band = buildUnderlineBand(topOffset);

			const svg = engine.getSVG(
				finalizedSegment.replace(/(\t)+/g, ''),
				{
					fontSize,
					left: left + finalizedLeftOffset,
					// Since we need to pass the baseline position, add the ascender to the top.
					top: top + topOffset + baselineOfWord + baselineDelta,
					letterSpacing
				},
				band
			);

			path = svg.path;

			if (shouldCollectDecorationBoxes && svg.boxes && svg.boxes.length) {
				(decorationGlyphs[line] || (decorationGlyphs[line] = [])).push(
					...svg.boxes
				);
			}

			wordBuffer = null;

			if (debug) {
				extra +=
					// Glyph
					buildXMLString('rect', {
						x: left + finalizedLeftOffset,
						y: top + topOffset + baselineDelta,
						width: finalizedWidth,
						height: heightOfWord,
						fill: 'transparent',
						stroke: '#575eff',
						'stroke-width': 1,
						transform: matrix ? matrix : undefined,
						'clip-path': clipPathId
							? `url(#${clipPathId})`
							: undefined
					}) +
					// Baseline
					buildXMLString('line', {
						x1: left + leftOffset,
						x2: left + leftOffset + layout.width,
						y1: top + topOffset + baselineDelta + baselineOfWord,
						y2: top + topOffset + baselineDelta + baselineOfWord,
						stroke: '#14c000',
						'stroke-width': 1,
						transform: matrix ? matrix : undefined,
						'clip-path': clipPathId
							? `url(#${clipPathId})`
							: undefined
					});
			}
		} else {
			// We need manually add the font ascender height to ensure it starts
			// at the baseline because <text>'s alignment baseline is set to `hanging`
			// by default and supported to change in SVG 1.1.
			topOffset += baselineOfWord + baselineDelta;

			if (shouldCollectDecorationBoxes && !image) {
				const band = buildUnderlineBand(topOffset);

				const svg = engine.getSVG(
					text.replace(/(\t)+/g, ''),
					{
						fontSize,
						left: left + leftOffset,
						top: top + topOffset,
						letterSpacing
					},
					band
				);

				if (svg.boxes && svg.boxes.length) {
					(
						decorationGlyphs[line] || (decorationGlyphs[line] = [])
					).push(...svg.boxes);
				}
			}
		}

		if (path !== null) {
			mergedPath += path + ' ';
		} else {
			const [t, shape] = buildText(
				{
					clipPathId,
					content: text,
					debug,
					fauxBoldStrokeWidth: engine.fauxBoldStrokeWidth,
					filter,
					height: heightOfWord,
					id,
					image,
					left: left + leftOffset,
					matrix,
					opacity,
					shape: !!_inheritedBackgroundClipTextPath,
					top: top + topOffset,
					width
				},
				parentStyle
			);
			result += t;
			backgroundClipDef += shape;
		}

		if (isLastDisplayedBeforeEllipsis) {
			break;
		}
	}

	if (parentStyle.textDecorationLine) {
		decorationShape = Object.entries(decorationLines)
			.map(([lineIndex, deco]) => {
				if (!deco) {
					return '';
				}
				const glyphBoxes = decorationGlyphs[lineIndex] || [];

				return buildDecoration(
					{
						ascender: deco.ascender,
						clipPathId,
						glyphBoxes,
						left: left + deco.left,
						matrix,
						top: deco.top,
						width: deco.width
					},
					parentStyle
				);
			})
			.join('');
	}

	// Embed the font as path.
	if (mergedPath) {
		const hasWebkitStroke = !!inheritedStyle.WebkitTextStrokeWidth;
		const needsFauxBold = engine.fauxBoldStrokeWidth !== undefined;
		const bothActive = hasWebkitStroke && needsFauxBold;
		const fillColor =
			filter &&
			(isFullyTransparent(parentStyle.color) ||
				(_inheritedBackgroundClipTextHasBackground &&
					isOpaqueWhite(parentStyle.color)))
				? 'black'
				: parentStyle.color;

		// When both faux bold and webkit-text-stroke apply, render a background
		// path with a wider webkit stroke that wraps around the faux bold body.
		// Uses miter join (not round) to preserve sharp glyph corners matching
		// the faux bold foreground path — round is only used for webkit-text-stroke
		// alone, where visible stroke corners benefit from rounding.
		const fauxBoldBgPath = bothActive
			? buildXMLString('path', {
					d: mergedPath,
					fill: fillColor,
					opacity: opacity !== 1 ? opacity : undefined,
					'paint-order': 'stroke',
					stroke: inheritedStyle.WebkitTextStrokeColor,
					'stroke-linejoin': 'miter',
					'stroke-width': `${
						Number(inheritedStyle.WebkitTextStrokeWidth) +
						engine.fauxBoldStrokeWidth
					}px`,
					transform: matrix ? matrix : undefined
			  })
			: '';

		const p =
			(!isFullyTransparent(parentStyle.color) ||
				filter ||
				hasWebkitStroke) &&
			opacity !== 0
				? `<g ${
						overflowMaskId ? `mask="url(#${overflowMaskId})"` : ''
				  } ${clipPathId ? `clip-path="url(#${clipPathId})"` : ''}>` +
				  fauxBoldBgPath +
				  buildXMLString('path', {
						d: mergedPath,
						fill: fillColor,
						opacity: opacity !== 1 ? opacity : undefined,
						'paint-order':
							hasWebkitStroke || needsFauxBold
								? 'stroke'
								: undefined,
						stroke: bothActive
							? fillColor
							: hasWebkitStroke
							? inheritedStyle.WebkitTextStrokeColor
							: needsFauxBold
							? fillColor
							: undefined,
						'stroke-linejoin':
							hasWebkitStroke && !bothActive
								? 'round'
								: needsFauxBold
								? 'miter'
								: undefined,
						'stroke-width': bothActive
							? `${engine.fauxBoldStrokeWidth}`
							: hasWebkitStroke
							? `${inheritedStyle.WebkitTextStrokeWidth}px`
							: needsFauxBold
							? `${engine.fauxBoldStrokeWidth}`
							: undefined,
						style: cssFilter ? `filter:${cssFilter}` : undefined,
						transform: matrix ? matrix : undefined
				  }) +
				  '</g>'
				: '';

		if (_inheritedBackgroundClipTextPath) {
			backgroundClipDef = buildXMLString('path', {
				d: mergedPath,
				transform: matrix ? matrix : undefined
			});
		}

		result +=
			(filter
				? filter +
				  buildXMLString(
						'g',
						{ filter: `url(#satori_s-${id})` },
						p + decorationShape
				  )
				: p + decorationShape) + extra;
	} else if (decorationShape) {
		result += filter
			? buildXMLString(
					'g',
					{ filter: `url(#satori_s-${id})` },
					decorationShape
			  )
			: decorationShape;
	}

	// Attach information to the parent node.
	if (backgroundClipDef) {
		(parentStyle._inheritedBackgroundClipTextPath as any).value +=
			backgroundClipDef;
	}

	return result;
};

export default buildTextNodes;
