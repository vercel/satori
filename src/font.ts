/**
 * This class handles everything related to fonts.
 */
import opentype from '@shuding/opentype.js';

import { Locale, locales, isValidLocale } from './language.js';

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type WeightName = 'normal' | 'bold';
type FontWeight = Weight | WeightName;
type FontStyle = 'normal' | 'italic';
const SUFFIX_WHEN_LANG_NOT_SET = 'unknown';

type FontOptions = {
	data: Buffer | ArrayBuffer;
	lang?: string;
	name: string;
	style?: FontStyle;
	weight?: Weight;
};

type GlyphBox = {
	x1: number;
	x2: number;
	y1: number;
	y2: number;
};
type SkipInkBand = {
	strokeWidth: number;
	underlineY: number;
};

type FontEngine = {
	baseline: (s?: string, resolvedFont?: any) => number;
	fauxBoldStrokeWidth?: number;
	getSVG: (
		s: string,
		style: {
			fontSize: number;
			left: number;
			letterSpacing: number;
			top: number;
		},
		band?: SkipInkBand
	) => { boxes: GlyphBox[]; path: string };
	has: (s: string) => boolean;
	height: (s?: string, resolvedFont?: any) => number;
	measure: (
		s: string,
		style: {
			fontSize: number;
			letterSpacing: number;
		}
	) => number;
};

type BandPoint = [number, number];

type LineSegment = {
	from: BandPoint;
	to: BandPoint;
};

const flattenPath = (commands: opentype.Path['commands']): LineSegment[] => {
	const segments: LineSegment[] = [];
	let start: BandPoint = [0, 0];
	let current: BandPoint = [0, 0];

	const addCurve = (points: BandPoint[], steps: number) => {
		let prev = points[0];
		for (let i = 1; i <= steps; i++) {
			const t = i / steps;
			const next = evaluateBezier(points, t);
			segments.push({ from: prev, to: next });
			prev = next;
		}
		current = points[points.length - 1];
	};

	for (const cmd of commands) {
		if (cmd.type === 'M') {
			start = current = [cmd.x, cmd.y];
			continue;
		}

		if (cmd.type === 'L') {
			const next: BandPoint = [cmd.x, cmd.y];
			segments.push({ from: current, to: next });
			current = next;
			continue;
		}

		if (cmd.type === 'Q') {
			addCurve([current, [cmd.x1, cmd.y1], [cmd.x, cmd.y]], 12);
			continue;
		}

		if (cmd.type === 'C') {
			addCurve(
				[current, [cmd.x1, cmd.y1], [cmd.x2, cmd.y2], [cmd.x, cmd.y]],
				16
			);
			continue;
		}

		if (cmd.type === 'Z') {
			segments.push({ from: current, to: start });
			current = start;
		}
	}

	return segments;
};

const evaluateBezier = (points: BandPoint[], t: number): BandPoint => {
	let working = points;

	while (working.length > 1) {
		const next: BandPoint[] = [];
		for (let i = 0; i < working.length - 1; i++) {
			next.push([
				working[i][0] + (working[i + 1][0] - working[i][0]) * t,
				working[i][1] + (working[i + 1][1] - working[i][1]) * t
			]);
		}
		working = next;
	}

	return working[0];
};

const computeBandBox = (
	commands: opentype.Path['commands'],
	band?: SkipInkBand
): GlyphBox[] => {
	if (!band) {
		return [];
	}

	const strokeWidth = band.strokeWidth;
	const bandMin = band.underlineY - strokeWidth * 0.25;
	const bandMax = band.underlineY + strokeWidth * 2.5;

	const segments = flattenPath(commands);
	if (!segments.length) {
		return [];
	}

	const bandHeight = bandMax - bandMin;
	const ySamples = Math.max(12, Math.ceil(bandHeight / 0.25));
	const yStep = bandHeight / ySamples;
	const yStart = bandMin + yStep / 2;

	const columnHits = new Set<number>();

	for (let i = 0; i < ySamples; i++) {
		const y = yStart + yStep * i;
		const intersections: number[] = [];

		for (const seg of segments) {
			const [x1, y1] = seg.from;
			const [x2, y2] = seg.to;

			if (y1 === y2) {
				continue;
			}
			const yMin = Math.min(y1, y2);
			const yMax = Math.max(y1, y2);
			if (y < yMin || y >= yMax) {
				continue;
			}

			const t = (y - y1) / (y2 - y1);
			const x = x1 + (x2 - x1) * t;
			intersections.push(x);
		}

		if (!intersections.length) {
			continue;
		}
		intersections.sort((a, b) => {
			return a - b;
		});

		for (let j = 0; j < intersections.length - 1; j += 2) {
			const from = Math.min(intersections[j], intersections[j + 1]);
			const to = Math.max(intersections[j], intersections[j + 1]);
			const start = Math.floor(from);
			const end = Math.ceil(to);
			for (let col = start; col < end; col++) {
				columnHits.add(col);
			}
		}
	}

	if (!columnHits.size) {
		return [];
	}

	const columns = Array.from(columnHits.values()).sort((a, b) => {
		return a - b;
	});
	const inkRanges: [number, number][] = [];

	let rangeStart = columns[0];
	let prev = columns[0];
	for (let i = 1; i < columns.length; i++) {
		const col = columns[i];
		if (col > prev + 1) {
			inkRanges.push([rangeStart, prev + 1]);
			rangeStart = col;
		}
		prev = col;
	}
	inkRanges.push([rangeStart, prev + 1]);

	const boxes: GlyphBox[] = [];
	const bleed = strokeWidth * 0.6;
	const minX = inkRanges[0][0];
	const maxX = inkRanges[inkRanges.length - 1][1];

	for (const [x1, x2] of inkRanges) {
		const left = Math.min(x1, minX) - bleed;
		const right = Math.max(x2, maxX) + bleed;
		boxes.push({
			x1: left,
			x2: right,
			y1: bandMin,
			y2: bandMax
		});
	}

	return boxes;
};

const compareFont = (
	weight,
	style,
	[matchedWeight, matchedStyle],
	[nextWeight, nextStyle]
) => {
	if (matchedWeight !== nextWeight) {
		// Put the defined weight first.
		if (!matchedWeight) {
			return 1;
		}
		if (!nextWeight) {
			return -1;
		}

		// Exact match.
		if (matchedWeight === weight) {
			return -1;
		}
		if (nextWeight === weight) {
			return 1;
		}

		// 400 and 500.
		if (weight === 400 && matchedWeight === 500) {
			return -1;
		}
		if (weight === 500 && matchedWeight === 400) {
			return -1;
		}
		if (weight === 400 && nextWeight === 500) {
			return 1;
		}
		if (weight === 500 && nextWeight === 400) {
			return 1;
		}

		// Less than 400.
		if (weight < 400) {
			if (matchedWeight < weight && nextWeight < weight) {
				return nextWeight - matchedWeight;
			}
			if (matchedWeight < weight) {
				return -1;
			}
			if (nextWeight < weight) {
				return 1;
			}
			return matchedWeight - nextWeight;
		}

		// Greater than 500.
		if (weight < matchedWeight && weight < nextWeight) {
			return matchedWeight - nextWeight;
		}
		if (weight < matchedWeight) {
			return -1;
		}
		if (weight < nextWeight) {
			return 1;
		}
		return nextWeight - matchedWeight;
	}

	if (matchedStyle !== nextStyle) {
		// Exact match.
		if (matchedStyle === style) {
			return -1;
		}
		if (nextStyle === style) {
			return 1;
		}
	}

	return -1;
};

const cachedParsedFont = new WeakMap<
	Buffer | ArrayBuffer,
	opentype.Font | null | undefined
>();

class FontLoader {
	defaultFont: opentype.Font;
	fonts = new Map<string, [opentype.Font, Weight?, FontStyle?][]>();
	constructor(fontOptions: FontOptions[]) {
		this.addFonts(fontOptions);
	}

	// Get font by name and weight.
	private get({
		name,
		weight,
		style
	}: {
		name: string;
		weight: Weight | WeightName;
		style: FontStyle;
	}) {
		if (!this.fonts.has(name)) {
			return null;
		}

		if (weight === 'normal') {
			weight = 400;
		}
		if (weight === 'bold') {
			weight = 700;
		}
		if (typeof weight === 'string') {
			weight = Number.parseInt(weight, 10) as Weight;
		}

		const fonts = [...this.fonts.get(name)];

		let matchedFont = fonts[0];

		// Fallback to the closest weight and style according to the strategy here:
		// https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#fallback_weights
		for (let i = 1; i < fonts.length; i++) {
			const [, weight1, style1] = matchedFont;
			const [, weight2, style2] = fonts[i];
			if (
				compareFont(
					weight,
					style,
					[weight1, style1],
					[weight2, style2]
				) > 0
			) {
				matchedFont = fonts[i];
			}
		}

		return { font: matchedFont[0], weight: matchedFont[1] };
	}

	public addFonts(fontOptions: FontOptions[]) {
		for (const fontOption of fontOptions) {
			const { name, data, lang } = fontOption;
			if (lang && !isValidLocale(lang)) {
				throw new Error(
					`Invalid value for props \`lang\`: "${lang}". The value must be one of the following: ${locales.join(
						', '
					)}.`
				);
			}
			const _lang = lang ?? SUFFIX_WHEN_LANG_NOT_SET;
			let font;

			if (cachedParsedFont.has(data)) {
				font = cachedParsedFont.get(data);
			} else {
				font = opentype.parse(
					// Buffer to ArrayBuffer.
					'buffer' in data
						? data.buffer.slice(
								data.byteOffset,
								data.byteOffset + data.byteLength
						  )
						: data,
					// @ts-ignore
					{ lowMemory: true }
				);
				// Modify the `charToGlyphIndex` method, so we can know which char is
				// being mapped to which glyph.
				const originalCharToGlyphIndex = font.charToGlyphIndex;
				font.charToGlyphIndex = char => {
					const index = originalCharToGlyphIndex.call(font, char);
					if (index === 0) {
						// The current requested char is missing a glyph.
						if ((font as any)._trackBrokenChars) {
							(font as any)._trackBrokenChars.push(char);
						}
					}
					return index;
				};

				cachedParsedFont.set(data, font);
			}

			// We use the first font as the default font fallback.
			if (!this.defaultFont) {
				this.defaultFont = font;
			}

			const _name = `${name.toLowerCase()}_${_lang}`;

			if (!this.fonts.has(_name)) {
				this.fonts.set(_name, []);
			}
			this.fonts
				.get(_name)
				.push([font, fontOption.weight, fontOption.style]);
		}
	}

	public getEngine(
		fontSize = 16,
		lineHeight: number | string = 'normal',
		{
			fontFamily = 'sans-serif',
			fontWeight = 400,
			fontStyle = 'normal'
		}: {
			fontFamily?: string | string[];
			fontWeight?: FontWeight;
			fontStyle?: FontStyle;
		},
		locale: Locale | undefined
	): FontEngine {
		if (!this.fonts.size) {
			throw new Error(
				'No fonts are loaded. Provide fonts via the `fonts` option — either an array of font data or a config with a `load` callback and `defaultFont`.'
			);
		}

		fontFamily = (
			Array.isArray(fontFamily) ? fontFamily : [fontFamily]
		).map(name => {
			return name.toLowerCase();
		});
		let fonts = [];
		let primaryMatchedWeight: Weight | undefined;

		fontFamily.forEach(face => {
			const getNormal = this.get({
				name: face,
				weight: fontWeight,
				style: fontStyle
			});
			if (getNormal) {
				fonts.push(getNormal.font);
				if (fonts.length === 1) {
					primaryMatchedWeight = getNormal.weight;
				}
				return;
			}

			const getUnknown = this.get({
				name: face + '_unknown',
				weight: fontWeight,
				style: fontStyle
			});

			if (getUnknown) {
				fonts.push(getUnknown.font);
				if (fonts.length === 1) {
					primaryMatchedWeight = getUnknown.weight;
				}
				return;
			}
		});

		// Add additional fonts as the fallback.
		const keys = Array.from(this.fonts.keys());
		const specifiedLangFonts = [];
		const nonSpecifiedLangFonts = [];
		const additionalFonts = [];
		const pushFallback = (
			arr: opentype.Font[],
			result: { font: opentype.Font; weight: Weight | undefined } | null
		) => {
			if (!result) {
				return;
			}
			arr.push(result.font);
			if (primaryMatchedWeight === undefined) {
				primaryMatchedWeight = result.weight;
			}
		};
		for (const name of keys) {
			if (fontFamily.includes(name)) {
				continue;
			}
			if (locale) {
				const lang = getLangFromFontName(name);
				if (lang) {
					if (lang === locale) {
						pushFallback(
							specifiedLangFonts,
							this.get({
								name,
								weight: fontWeight,
								style: fontStyle
							})
						);
					} else {
						pushFallback(
							nonSpecifiedLangFonts,
							this.get({
								name,
								weight: fontWeight,
								style: fontStyle
							})
						);
					}
				} else {
					pushFallback(
						additionalFonts,
						this.get({
							name,
							weight: fontWeight,
							style: fontStyle
						})
					);
				}
			} else {
				pushFallback(
					additionalFonts,
					this.get({
						name,
						weight: fontWeight,
						style: fontStyle
					})
				);
			}
		}

		const cachedFontResolver = new Map<number, opentype.Font | undefined>();
		const resolveFont = (word: string, fallback = true) => {
			const _fonts = [
				...fonts,
				...additionalFonts,
				...specifiedLangFonts,
				...(fallback ? nonSpecifiedLangFonts : [])
			];

			if (typeof word === 'undefined') {
				if (fallback) {
					return _fonts[_fonts.length - 1];
				}
				return undefined;
			}

			const code = word.charCodeAt(0);
			if (cachedFontResolver.has(code)) {
				return cachedFontResolver.get(code);
			}

			const font = _fonts.find((_font, index) => {
				return (
					!!_font.charToGlyphIndex(word) ||
					(fallback && index === _fonts.length - 1)
				);
			});

			if (font) {
				cachedFontResolver.set(code, font);
			}

			return font;
		};

		const ascender = (resolvedFont: opentype.Font, useOS2Table = false) => {
			const _ascender =
				(useOS2Table ? resolvedFont.tables?.os2?.sTypoAscender : 0) ||
				resolvedFont.ascender;
			return (_ascender / resolvedFont.unitsPerEm) * fontSize;
		};

		const descender = (
			resolvedFont: opentype.Font,
			useOS2Table = false
		) => {
			const _descender =
				(useOS2Table ? resolvedFont.tables?.os2?.sTypoDescender : 0) ||
				resolvedFont.descender;
			return (_descender / resolvedFont.unitsPerEm) * fontSize;
		};

		const height = (resolvedFont: opentype.Font, useOS2Table = false) => {
			if ('string' === typeof lineHeight && 'normal' === lineHeight) {
				const _lineGap =
					(useOS2Table
						? resolvedFont.tables?.os2?.sTypoLineGap
						: 0) || 0;
				return (
					ascender(resolvedFont, useOS2Table) -
					descender(resolvedFont, useOS2Table) +
					(_lineGap / resolvedFont.unitsPerEm) * fontSize
				);
			} else if ('number' === typeof lineHeight) {
				return fontSize * lineHeight;
			}
		};

		const resolve = (s: string) => {
			return resolveFont(s, false);
		};

		// Compute faux bold stroke width when requested weight exceeds available weight.
		let fauxBoldStrokeWidth: number | undefined;
		const normalizedWeight =
			fontWeight === 'bold'
				? 700
				: fontWeight === 'normal'
				? 400
				: Number(fontWeight);
		if (
			normalizedWeight >= 600 &&
			(!primaryMatchedWeight || primaryMatchedWeight < 600)
		) {
			const weightDiff = normalizedWeight - (primaryMatchedWeight || 400);
			fauxBoldStrokeWidth = fontSize * 0.05 * (weightDiff / 300);
		}

		const engine = {
			baseline: (
				s?: string,
				resolvedFont = typeof s === 'undefined'
					? fonts[0]
					: resolveFont(s)
			) => {
				const asc = ascender(resolvedFont);
				const desc = descender(resolvedFont);
				const contentHeight = asc - desc;

				return asc + (height(resolvedFont) - contentHeight) / 2;
			},
			fauxBoldStrokeWidth,
			getSVG: (
				s: string,
				style: {
					fontSize: number;
					left: number;
					letterSpacing: number;
					top: number;
				},
				band?: SkipInkBand
			) => {
				return this.getSVG(resolveFont, s, style, band);
			},
			has: (s: string) => {
				if (s === '\n') {
					return true;
				}
				const font = resolve(s);
				if (!font) {
					return false;
				}
				(font as any)._trackBrokenChars = [];
				font.stringToGlyphs(s);
				if (!(font as any)._trackBrokenChars.length) {
					return true;
				}
				(font as any)._trackBrokenChars = undefined;
				return false;
			},
			height: (
				s?: string,
				resolvedFont = typeof s === 'undefined'
					? fonts[0]
					: resolveFont(s)
			) => {
				return height(resolvedFont);
			},
			measure: (
				s: string,
				style: {
					fontSize: number;
					letterSpacing: number;
				}
			) => {
				return this.measure(resolveFont, s, style);
			}
		};

		return engine;
	}

	private patchFontFallbackResolver(
		font: opentype.Font,
		resolveFont: (word: string, fallback?: boolean) => opentype.Font
	) {
		const brokenChars = [];
		(font as any)._trackBrokenChars = brokenChars;

		const originalStringToGlyphs = font.stringToGlyphs;
		font.stringToGlyphs = (s: string, ...args: any) => {
			const glyphs = originalStringToGlyphs.call(font, s, ...args);

			for (let i = 0; i < glyphs.length; i++) {
				// Hitting an undefined glyph. We have to try to resolve it from other
				// fonts.
				// @TODO: This affects the kerning resolution but should be fine for now.
				if (glyphs[i].unicode === undefined) {
					const char = brokenChars.shift();
					const anotherFont = resolveFont(char);
					if (anotherFont !== font) {
						const glyph = anotherFont.charToGlyph(char);
						// Scale the glyph to match the current units per em.
						const scale = font.unitsPerEm / anotherFont.unitsPerEm;
						const p = new opentype.Path();
						p.unitsPerEm = font.unitsPerEm;
						p.commands = glyph.path.commands.map(command => {
							const scaledCommand = { ...command };
							for (let k in scaledCommand) {
								if (typeof scaledCommand[k] === 'number') {
									scaledCommand[k] *= scale;
								}
							}
							return scaledCommand;
						});
						const g = new opentype.Glyph({
							...glyph,
							advanceWidth: glyph.advanceWidth * scale,
							path: p,
							xMax: glyph.xMax * scale,
							xMin: glyph.xMin * scale,
							yMax: glyph.yMax * scale,
							yMin: glyph.yMin * scale
						});

						glyphs[i] = g;
					}
				}
			}

			return glyphs;
		};

		return () => {
			font.stringToGlyphs = originalStringToGlyphs;
			(font as any)._trackBrokenChars = undefined;
		};
	}

	private measure(
		resolveFont: (word: string, fallback?: boolean) => opentype.Font,
		content: string,
		{
			fontSize,
			letterSpacing = 0
		}: {
			fontSize: number;
			letterSpacing: number;
		}
	) {
		const font = resolveFont(content);
		const unpatch = this.patchFontFallbackResolver(font, resolveFont);

		try {
			return font.getAdvanceWidth(content, fontSize, {
				letterSpacing: letterSpacing / fontSize
			});
		} finally {
			unpatch();
		}
	}

	private getSVG(
		resolveFont: (word: string, fallback?: boolean) => opentype.Font,
		content: string,
		{
			fontSize,
			top,
			left,
			letterSpacing = 0
		}: {
			fontSize: number;
			top: number;
			left: number;
			letterSpacing: number;
		},
		band?: SkipInkBand
	): { boxes: GlyphBox[]; path: string } {
		const font = resolveFont(content);
		const unpatch = this.patchFontFallbackResolver(font, resolveFont);

		try {
			if (fontSize === 0) {
				return { boxes: [], path: '' };
			}

			const fullPath = new opentype.Path();
			const boxes: GlyphBox[] = [];

			const options = {
				letterSpacing: letterSpacing / fontSize
			};

			const cachedPath = new WeakMap<
				opentype.Glyph,
				[number, number, opentype.Path]
			>();

			font.forEachGlyph(
				content.replace(/\n/g, ''),
				left,
				top,
				fontSize,
				options,
				function (glyph, gX, gY, gFontSize) {
					let glyphPath: opentype.Path;
					if (!cachedPath.has(glyph)) {
						glyphPath = glyph.getPath(gX, gY, gFontSize, options);
						cachedPath.set(glyph, [gX, gY, glyphPath]);
					} else {
						const [_x, _y, _glyphPath] = cachedPath.get(glyph);
						glyphPath = new opentype.Path();
						glyphPath.commands = _glyphPath.commands.map(
							command => {
								const movedCommand = { ...command };
								for (let k in movedCommand) {
									if (typeof movedCommand[k] === 'number') {
										if (
											k === 'x' ||
											k === 'x1' ||
											k === 'x2'
										) {
											movedCommand[k] += gX - _x;
										}
										if (
											k === 'y' ||
											k === 'y1' ||
											k === 'y2'
										) {
											movedCommand[k] += gY - _y;
										}
									}
								}
								return movedCommand;
							}
						);
					}

					const bandBoxes = band
						? computeBandBox(glyphPath.commands, band)
						: [];
					if (bandBoxes.length) {
						boxes.push(...bandBoxes);
					}

					fullPath.extend(glyphPath);
				}
			);

			return {
				boxes,
				path: fullPath.toPathData(1)
			};
		} finally {
			unpatch();
		}
	}
}

const getLangFromFontName = (name: string): Locale | undefined => {
	const arr = name.split('_');
	const lang = arr[arr.length - 1];

	return lang === SUFFIX_WHEN_LANG_NOT_SET ? undefined : (lang as Locale);
};

export type {
	FontEngine,
	FontOptions,
	FontStyle,
	FontWeight,
	GlyphBox,
	Weight,
	WeightName
};
export default FontLoader;
