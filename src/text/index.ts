/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */
import type { LayoutContext } from '../layout.js'
import {
  v,
  segment,
  wordSeparators,
  buildXMLString,
  isUndefined,
  lengthToNumber,
  roundUpToLayout,
} from '../utils.js'
import { LayoutNode } from '../layout-engine/index.js'
import buildText, {
  buildGlyphPaths,
  container,
  getTextFillColor,
  getTextStrokeAttributes,
} from '../builder/text.js'
import { buildDropShadow } from '../builder/shadow.js'
import buildDecoration, {
  getDecorationLines,
  getDecorationThickness,
  getUnderlineY,
} from '../builder/text-decoration.js'
import { getSyntheticBoldWidth, type GlyphBox } from '../font.js'
import { Locale } from '../language.js'
import { HorizontalEllipsis, Space, Tab } from './characters.js'
import { genMeasurer } from './measurer.js'
import {
  getTabAdvance,
  getTabWidth,
  preprocess,
  resolveTextAlign,
} from './processor.js'
import { getFontFeatureSettings } from './font-features.js'
import {
  getBidiClass,
  hasRTL,
  reorderLine,
  resolveLevels,
  splitByDirection,
} from './bidi.js'
import cssColorParse from 'parse-css-color'
import { isOutside } from '../culling.js'

const skippedWordWhenFindingMissingFont = new Set([Tab])

function shouldSkipWhenFindingMissingFont(word: string): boolean {
  return skippedWordWhenFindingMissingFont.has(word)
}

function isFullyTransparent(color: string): boolean {
  if (color === 'transparent') return true
  const parsed = cssColorParse(color)
  return parsed ? parsed.alpha === 0 : false
}

function isOpaqueWhite(color: string): boolean {
  if (!color) return false
  const parsed = cssColorParse(color)
  if (!parsed) return false
  const [r, g, b, a] = parsed.values
  return r === 255 && g === 255 && b === 255 && (a === undefined || a === 1)
}

export default async function* buildTextNodes(
  content: string,
  context: LayoutContext
): AsyncGenerator<{ word: string; locale?: Locale }[], string, [any, any]> {
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
    canLoadAdditionalAssets,
    pointScaleFactor,
    paintBounds,
  } = context

  const {
    textAlign,
    textIndent = 0,
    lineHeight,
    textWrap,
    fontSize,
    filter: cssFilter,
    letterSpacing,
    wordSpacing,
    _inheritedBackgroundClipTextPath,
    _inheritedBackgroundClipTextHasBackground,
  } = parentStyle
  const fontFeatureSettings = getFontFeatureSettings(parentStyle)

  const {
    words: segmentedWords,
    requiredBreaks: segmentedRequiredBreaks,
    allowSoftWrap,
    allowBreakWord,
    allowBreakWordInMinContent,
    processedContent,
    shouldCollapseTabsAndSpaces,
    lineLimit,
    blockEllipsis,
  } = preprocess(content, parentStyle, locale)

  v(
    textAlign,
    {
      left: true,
      right: true,
      center: true,
      justify: true,
      // We don't have other writing modes yet.
      start: true,
      end: true,
    },
    true,
    'textAlign'
  )

  // Lines start at the right with `rtl`. Their pieces are reordered with the
  // bidi algorithm with `rtl`, or when they have right-to-left text, see
  // `reorderLines()`.
  const isRTL = parentStyle.direction === 'rtl'
  const align = resolveTextAlign(textAlign, parentStyle.direction)
  const needsBidi = isRTL || hasRTL(processedContent)

  // The indent of the first line, at its start. Percentages are of the width
  // the text is laid out in, and of 0 for its max-content size.
  const getIndent = (width: number) => {
    const indent =
      typeof textIndent === 'string'
        ? lengthToNumber(textIndent, fontSize, width, parentStyle, true)
        : textIndent
    return Number.isFinite(indent) ? (indent as number) : 0
  }

  // Like the anonymous flex item around text in CSS, or the paragraph of a
  // block container.
  const textContainer = context.textNode ?? new LayoutNode({ flexShrink: 1 })
  if (!context.textNode) parent.insertChild(textContainer)

  // Get the correct font according to the container style.
  // https://www.w3.org/TR/CSS2/visudet.html
  let engine = font.getEngine(fontSize, lineHeight, parentStyle, locale)

  // Yield segments that are missing a font.
  const wordsMissingFont = canLoadAdditionalAssets
    ? segment(processedContent, 'grapheme').filter(
        (word) => !shouldSkipWhenFindingMissingFont(word) && !engine.has(word)
      )
    : []

  yield wordsMissingFont.map((word) => {
    return {
      word,
      locale,
    }
  })

  if (wordsMissingFont.length) {
    // Reload the engine with additional fonts.
    engine = font.getEngine(fontSize, lineHeight, parentStyle, locale)
  }

  function isImage(s: string): boolean {
    return !!(
      graphemeImages &&
      Object.prototype.hasOwnProperty.call(graphemeImages, s) &&
      graphemeImages[s]
    )
  }

  const { measureGrapheme, measureGraphemeArray, measureText } = genMeasurer(
    engine,
    isImage,
    {
      fontSize,
      letterSpacing,
      wordSpacing: wordSpacing as number,
      fontFeatureSettings,
    }
  )

  const tabWidth = getTabWidth(parentStyle, measureGrapheme(Space))

  const tabAdvance = (x: number, count: number) =>
    getTabAdvance(x, count, tabWidth, measureGrapheme(Space))

  const calc = (
    text: string,
    currentWidth: number
  ): {
    originWidth: number
    endingSpacesWidth: number
    text: string
  } => {
    if (text.length === 0) {
      return {
        originWidth: 0,
        endingSpacesWidth: 0,
        text,
      }
    }

    let originWidth = 0

    if (text.includes(Tab)) {
      // Tabs move to the next tab stop, from the start of the line.
      let x = currentWidth
      for (const part of text.split(/(\t+)/)) {
        if (part) {
          x += part[0] === Tab ? tabAdvance(x, part.length) : measureText(part)
        }
      }
      originWidth = x - currentWidth
    } else {
      originWidth = measureText(text)
    }

    const afterTrimEndWidth =
      text.trimEnd() === text ? originWidth : measureText(text.trimEnd())

    return {
      originWidth,
      endingSpacesWidth: originWidth - afterTrimEndWidth,
      text,
    }
  }

  // Global variables used to compute the text layout.
  // @TODO: Use segments instead of words to properly support kerning.
  let lineWidths = []
  let baselines = []
  let lastBaseline: number | undefined
  let lineSegmentNumber = []
  let texts: string[] = []
  let wordPositionInLayout: (null | {
    x: number
    y: number
    width: number
    line: number
    lineIndex: number
    isImage: boolean
    /** With bidi, how far `justify` moves the piece. */
    justifyShift?: number
  })[] = []

  // Whether the min-content size is measured, see `canBreakWords()`.
  let measuringMinContent = false

  // With the given container width, compute the text layout.
  function flow(width: number) {
    let lines = 0
    let maxWidth = 0
    let lineIndex = -1
    let height = 0
    let currentWidth = 0
    let currentLineHeight = 0
    let currentBaselineOffset = 0

    lineWidths = []
    baselines = []
    lineSegmentNumber = [0]
    texts = []
    wordPositionInLayout = []

    // The text is laid out with several widths, and words may be broken for
    // one of them, so keep the original words.
    const words = segmentedWords.slice()
    const requiredBreaks = segmentedRequiredBreaks.slice()

    // The first line is shorter by the indent. Tab stops are from the start
    // of the container, before the indent.
    const indent = getIndent(width)
    const lineIndent = () => (lines === 0 ? indent : 0)

    // We naively implement the width calculation without proper kerning.
    // @TODO: Support different writing modes.
    let i = 0
    let prevLineEndingSpacesWidth = 0
    while (i < words.length && lines < lineLimit) {
      let word = words[i]
      const forceBreak = requiredBreaks[i]

      let w = 0

      const {
        originWidth,
        endingSpacesWidth,
        text: _word,
      } = calc(word, currentWidth + lineIndent())
      word = _word

      w = originWidth
      const lineEndingSpacesWidth = endingSpacesWidth

      // When starting a new line from an empty line, we should push one extra
      // line height.
      if (forceBreak && currentLineHeight === 0) {
        currentLineHeight = engine.height(word)
      }

      const allowedToJustify = textAlign === 'justify'

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
        currentWidth + w > width - lineIndent() + lineEndingSpacesWidth &&
        allowSoftWrap

      // Need to break the word if:
      // - we have break-word
      // - the word is wider than the container width
      // - the word will be put at the beginning of the line
      // A single grapheme can't be broken, even if it's wider than the
      // container, e.g. when measuring the min-content width.
      const needToBreakWord =
        (measuringMinContent ? allowBreakWordInMinContent : allowBreakWord) &&
        w > width - lineIndent() &&
        (!currentWidth || willWrap || forceBreak)
      const chars = needToBreakWord ? segment(word, 'grapheme') : undefined

      if (chars && chars.length > 1) {
        // Break the word into multiple segments and continue the loop.
        words.splice(i, 1, ...chars)
        requiredBreaks.splice(
          i,
          1,
          forceBreak,
          ...chars.slice(1).map(() => false)
        )
        if (currentWidth > 0) {
          // Start a new line, spaces can be ignored.
          lineWidths.push(currentWidth - prevLineEndingSpacesWidth)
          baselines.push(currentBaselineOffset)
          lines++
          height += currentLineHeight
          currentWidth = 0
          currentLineHeight = 0
          currentBaselineOffset = 0
          lineSegmentNumber.push(1)
          lineIndex = -1
        }
        prevLineEndingSpacesWidth = lineEndingSpacesWidth
        continue
      }
      if (forceBreak || willWrap) {
        // Start a new line, spaces can be ignored.
        if (shouldCollapseTabsAndSpaces && word === Space) {
          w = 0
        } else if (word.includes(Tab)) {
          w = calc(word, 0).originWidth
        }

        lineWidths.push(currentWidth - prevLineEndingSpacesWidth)
        baselines.push(currentBaselineOffset)
        lines++
        height += currentLineHeight
        currentWidth = w
        currentLineHeight = w ? Math.round(engine.height(word)) : 0
        currentBaselineOffset = w ? Math.round(engine.baseline(word)) : 0
        lineSegmentNumber.push(1)
        lineIndex = -1

        // If it's naturally broken, we update the max width.
        // Since if there are multiple lines, the width should fit the
        // container.
        if (!forceBreak) {
          maxWidth = Math.max(maxWidth, width)
        }
      } else {
        // It fits into the current line.
        currentWidth += w
        const glyphHeight = Math.round(engine.height(word))
        if (glyphHeight > currentLineHeight) {
          // Use the baseline of the highest segment as the baseline of the line.
          currentLineHeight = glyphHeight
          currentBaselineOffset = Math.round(engine.baseline(word))
        }
        if (allowedToJustify) {
          lineSegmentNumber[lineSegmentNumber.length - 1]++
        }
      }

      if (allowedToJustify) {
        lineIndex++
      }

      maxWidth = Math.max(maxWidth, currentWidth + lineIndent())

      let x = currentWidth - w

      if (w === 0) {
        wordPositionInLayout.push({
          y: height,
          x,
          width: 0,
          line: lines,
          lineIndex,
          isImage: false,
        })
      } else {
        // Parts of words in different directions are reordered separately.
        const _texts = needsBidi
          ? segment(word, 'word').flatMap(splitByDirection)
          : segment(word, 'word')

        for (let j = 0; j < _texts.length; j++) {
          const _text = _texts[j]
          let _width = 0
          let _isImage = false

          if (isImage(_text)) {
            _width = fontSize
            _isImage = true
          } else if (_text[0] === Tab) {
            _width = tabAdvance(x + lineIndent(), _text.length)
          } else if (!embedFont && _text.length > 1) {
            // When embedFont is false, use measureText for multi-character strings
            // to ensure consistency with how currentWidth is accumulated (sum of
            // grapheme widths). measureGrapheme uses getAdvanceWidth which includes
            // kerning, causing position mismatches between consecutive <text> elements.
            _width = measureText(_text)
          } else {
            _width = measureGrapheme(_text)
          }

          texts.push(_text)
          wordPositionInLayout.push({
            y: height,
            x,
            width: _width,
            line: lines,
            lineIndex,
            isImage: _isImage,
          })

          // Widths include the letter spacing after each character, so they
          // add up to the width of the word.
          x += _width
        }
      }

      i++
      prevLineEndingSpacesWidth = lineEndingSpacesWidth
    }

    if (currentWidth) {
      if (lines < lineLimit) {
        height += currentLineHeight
      }
      lines++
      lineWidths.push(currentWidth)
      baselines.push(currentBaselineOffset)
      lastBaseline = height - currentLineHeight + currentBaselineOffset
    } else {
      lastBaseline = lines ? height : undefined
    }

    // @TODO: Support `line-height`.
    return { width: maxWidth, height }
  }

  // It's possible that the text's measured size is different from the container's
  // size, because the container might have a fixed width or height or being
  // expanded by its parent.
  let measuredTextSize = { width: 0, height: 0 }
  const layoutText = (containerWidth: number) => {
    const { width, height } = flow(containerWidth)

    // When doing `text-wrap: balance`, we reflow the text multiple times
    // using binary search to find the best width.
    // https://www.w3.org/TR/css-text-4/#valdef-text-wrap-balance
    if (textWrap === 'balance') {
      let l = width / 2
      let r = width
      let m: number = width
      while (l + 1 < r) {
        m = (l + r) / 2
        const { height: mHeight } = flow(m)
        if (mHeight > height) {
          l = m
        } else {
          r = m
        }
      }
      // The lines are balanced, but like in browsers, the size of the text
      // doesn't change.
      flow(r)
      const _width = roundUpToLayout(width, pointScaleFactor)
      measuredTextSize = { width: _width, height }
      return { width: _width, height }
    }

    // When doing `text-wrap: pretty`, we try to avoid ending a paragraph with a single word
    // by reshaping all lines in a way that achieves more balanced line lengths
    // This "pretty" line breaking algorithm tries to achieve optimal line breaks
    // that avoid orphans (single words at the end of a paragraph) and create
    // visually pleasing line lengths.
    if (textWrap === 'pretty') {
      // Check if the last line has a single word or is very short
      // (typically less than 1/3 of the container width)
      const lastLineWidth = lineWidths[lineWidths.length - 1]
      const isLastLineShort = lastLineWidth < width / 3

      if (isLastLineShort) {
        // Reflow the paragraph with slightly adjusted line breaks
        // to avoid orphans and create more even line lengths
        // This is a simplified approach - a real implementation would use a
        // more sophisticated algorithm to find optimal line breaks

        // We'll just reflow once with slightly reduced width to force
        // redistribution of words. This is much simplified from the actual
        // paragraph-level line breaking algorithm which would compute scores
        // for different line break combinations.
        const adjustedWidth = width * 0.9
        const result = flow(adjustedWidth)

        // Use the result if it reduces orphans without adding too many lines
        if (result.height <= height * 1.3) {
          measuredTextSize = { width, height: result.height }
          return { width, height: result.height }
        }
      }
    }

    const _width = roundUpToLayout(width, pointScaleFactor)
    measuredTextSize = { width: _width, height }
    return { width: _width, height }
  }

  // The layout engine measures the text several times, often with the same
  // width. The size only depends on the width, so cache it. `flowedWidth` is
  // the width that the line state, e.g. `lineWidths`, was computed for.
  const measureCache = new Map<
    number,
    {
      width: number
      height: number
      firstBaseline?: number
      lastBaseline?: number
    }
  >()
  let flowedWidth: number | undefined
  const measure = (
    containerWidth: number,
    _height?: number,
    _exclusions?: unknown,
    minContent = false
  ) => {
    // The min-content size may break fewer words than a width of 0.
    const key = minContent ? -1 : containerWidth
    let cached = measureCache.get(key)
    if (!cached) {
      measuringMinContent = minContent
      cached = { ...layoutText(containerWidth), lastBaseline }
      // The first line starts at the top. Without baselines, the layout would
      // align the text by its bottom, e.g. with `alignItems: baseline`.
      if (baselines.length) cached.firstBaseline = baselines[0]
      measuringMinContent = false
      flowedWidth = minContent ? undefined : containerWidth
      measureCache.set(key, cached)
    }
    return cached
  }
  textContainer.measure = measure
  textContainer.lastBaseline = (width) => {
    measure(width)
    return measureCache.get(width).lastBaseline
  }

  const [x, y] = yield

  let result = ''
  let backgroundClipDef = ''

  const clipPathId = inheritedStyle._inheritedClipPathId as string | undefined
  const overflowMaskId = inheritedStyle._inheritedMaskId as number | undefined
  const fillColor = getTextFillColor(parentStyle)

  const {
    left: containerLeft,
    top: containerTop,
    width: containerWidth,
    height: containerHeight,
  } = textContainer.layout

  // The layout engine may have measured the text with other widths last, so
  // lay it out again with the final width.
  if (flowedWidth !== containerWidth) layoutText(containerWidth)

  const textIndentNumber = getIndent(containerWidth)
  const parentContainerInnerWidth = parent.contentWidth

  // The pieces of each line are positioned by their bidi levels, which are
  // also the directions they're shaped in. Lines are from the right with
  // `rtl`. Without right-to-left text, they're in logical order.
  const baseLevel = isRTL ? 1 : 0
  const levels = needsBidi ? reorderLines() : undefined
  function reorderLines() {
    const pieceLevels = resolveLevels(
      wordPositionInLayout.map((_, i) => getBidiClass(texts[i] ?? '')),
      baseLevel
    )
    for (let start = 0; start < wordPositionInLayout.length; ) {
      const line = wordPositionInLayout[start]?.line
      let end = start + 1
      while (
        end < wordPositionInLayout.length &&
        wordPositionInLayout[end]?.line === line
      ) {
        end++
      }
      const pieces = wordPositionInLayout.slice(start, end)
      if (line === undefined || pieces.some((piece) => !piece)) {
        start = end
        continue
      }

      // L1: spaces at the end of a line have the base level.
      for (let i = end - 1; i >= start && !texts[i]?.trim(); i--) {
        pieceLevels[i] = baseLevel
      }
      const lefts = reorderLine(
        pieces,
        pieceLevels.slice(start, end),
        lineWidths[line] ?? 0
      )
      pieces.forEach((piece, index) => {
        piece.x = lefts[index]
      })

      // Justified lines are widened between pieces of different words, from
      // the left.
      if (align === 'justify' && line < lineWidths.length - 1) {
        const order = pieces
          .map((_, index) => index)
          .sort((a, b) => pieces[a].x - pieces[b].x)
        const isGap = (k: number) =>
          k > 0 && pieces[order[k]].lineIndex !== pieces[order[k - 1]].lineIndex
        const gaps = order.filter((_, k) => isGap(k)).length
        const remainingWidth =
          containerWidth -
          lineWidths[line] -
          (line === 0 ? textIndentNumber : 0)
        const gutter = gaps ? remainingWidth / gaps : 0
        let count = 0
        order.forEach((index, k) => {
          if (isGap(k)) count++
          pieces[index].justifyShift = gutter * count
        })
      }
      start = end
    }
    return pieceLevels
  }

  type PlacedPiece = NonNullable<typeof wordPositionInLayout[number]>

  // Where a piece is drawn in the container, after its line is indented and
  // aligned, and the left of its line. The first line is aligned beside its
  // indent.
  function placePiece(layout: PlacedPiece) {
    const { line } = layout
    const indent = line === 0 ? textIndentNumber : 0
    const remainingWidth = containerWidth - lineWidths[line] - indent
    const isJustified = align === 'justify' && line < lineWidths.length - 1

    if (isRTL) {
      // Lines are aligned even when the container is as wide as their text,
      // so they're at the right of a wider container. The indent is on the
      // right. The last line of justified text is aligned to the start.
      let lineLeft = 0
      if (align === 'right' || (align === 'justify' && !isJustified)) {
        lineLeft = remainingWidth
      } else if (align === 'center') {
        lineLeft = remainingWidth / 2
      }
      let leftOffset = layout.x + lineLeft
      if (isJustified) leftOffset += layout.justifyShift ?? 0
      if (embedFont) {
        leftOffset = Math.round(leftOffset)
        lineLeft = Math.round(lineLeft)
      }
      return { leftOffset, lineLeft, extendedWidth: isJustified }
    }

    let leftOffset = layout.x
    let lineLeft = indent
    let extendedWidth = false
    if (indent) leftOffset += indent
    if (
      lineWidths.length > 1 ||
      (context.blockParagraph && (align === 'right' || align === 'center'))
    ) {
      // A flex item around text is as wide as a single line, but a paragraph
      // of a block container fills its width.
      if (align === 'right') {
        leftOffset += remainingWidth
        lineLeft += remainingWidth
      } else if (align === 'center') {
        leftOffset += remainingWidth / 2
        lineLeft += remainingWidth / 2
      } else if (isJustified) {
        if (layout.justifyShift !== undefined) {
          leftOffset += layout.justifyShift
        } else {
          const segments = lineSegmentNumber[line]
          const gutter = segments > 1 ? remainingWidth / (segments - 1) : 0
          leftOffset += gutter * layout.lineIndex
        }
        extendedWidth = true
      }

      // Only round for embedded fonts (paths benefit from pixel alignment).
      // For non-embedded fonts (<text> elements), keep fractional positions
      // to maintain consistent spacing between consecutive elements.
      if (embedFont) {
        leftOffset = Math.round(leftOffset)
        lineLeft = Math.round(lineLeft)
      }
    }
    return { leftOffset, lineLeft, extendedWidth }
  }

  // With bidi, the line that ends in an ellipsis is cut in visual order: the
  // pieces past its end edge, on the right or on the left with `rtl`, are
  // hidden, and the ellipsis is drawn after the others.
  // https://drafts.csswg.org/css-overflow/#text-overflow
  const ellipsisPlan =
    levels && lineLimit !== Infinity ? planEllipsis(lineLimit - 1) : null
  function planEllipsis(line: number) {
    if (
      line >= lineWidths.length ||
      (line === lineWidths.length - 1 &&
        lineWidths[line] <= parentContainerInnerWidth)
    ) {
      return null
    }
    let text = blockEllipsis
    let width = measureGrapheme(text)
    if (width > parentContainerInnerWidth) {
      text = HorizontalEllipsis
      width = measureGrapheme(text)
    }

    // Distances from the start edge of the container.
    const limit = parentContainerInnerWidth - width
    const pieces: { index: number; left: number; width: number }[] = []
    wordPositionInLayout.forEach((layout, index) => {
      if (layout?.line !== line) return
      const { leftOffset } = placePiece(layout)
      pieces.push({ index, left: leftOffset, width: layout.width })
    })
    const near = (piece: typeof pieces[number]) =>
      isRTL ? containerWidth - piece.left - piece.width : piece.left
    pieces.sort((a, b) => near(a) - near(b))

    const hidden = new Set<number>()
    let truncated: { index: number; text: string; left: number } | undefined
    // The edge of the text that's kept, without spaces, on the side of the
    // end edge.
    let end: number | undefined
    for (const piece of pieces) {
      const pieceText = texts[piece.index] ?? ''
      if (hidden.size || truncated) {
        hidden.add(piece.index)
      } else if (near(piece) + piece.width <= limit) {
        if (pieceText.trim()) {
          end = isRTL ? piece.left : piece.left + piece.width
        }
      } else {
        // The graphemes of the piece on the side of the start edge are kept,
        // which is its start if it's in the direction of the line. Like in
        // browsers, the first one of the line is always kept.
        const keepsStart = (levels[piece.index] % 2 === 1) === isRTL
        const graphemes = segment(pieceText.trim(), 'grapheme', locale)
        if (!keepsStart) graphemes.reverse()
        let kept = ''
        let keptWidth = 0
        for (const grapheme of graphemes) {
          const next = keepsStart ? kept + grapheme : grapheme + kept
          const nextWidth = measureGraphemeArray([next])
          if ((kept || end !== undefined) && near(piece) + nextWidth > limit) {
            break
          }
          kept = next
          keptWidth = nextWidth
        }
        if (kept) {
          let keptLeft = isRTL
            ? piece.left + piece.width - keptWidth
            : piece.left
          if (embedFont) keptLeft = Math.round(keptLeft)
          truncated = { index: piece.index, text: kept, left: keptLeft }
          end = isRTL ? keptLeft : keptLeft + keptWidth
        } else {
          hidden.add(piece.index)
        }
      }
    }
    end ??= isRTL ? containerWidth : 0
    return {
      line,
      hidden,
      truncated,
      text,
      width,
      end,
      left: isRTL ? end - width : end,
    }
  }

  // Attach offset to the current node.
  const left = x + containerLeft
  const top = y + containerTop

  const { matrix } = container(
    {
      left: containerLeft,
      top: containerTop,
      width: containerWidth,
      height: containerHeight,
      isInheritingTransform,
    },
    parentStyle
  )

  let filter = ''
  if (parentStyle.textShadowOffset) {
    const { textShadowColor, textShadowOffset, textShadowRadius } = parentStyle

    filter = buildDropShadow(
      {
        width: measuredTextSize.width,
        height: measuredTextSize.height,
        id,
      },
      {
        shadowColor: textShadowColor,
        shadowOffset: textShadowOffset,
        shadowRadius: textShadowRadius,
      },
      isFullyTransparent(fillColor) ||
        (_inheritedBackgroundClipTextHasBackground && isOpaqueWhite(fillColor))
    )

    filter = buildXMLString('defs', {}, filter)
  }

  let decorationShape = ''
  let mergedPath = ''
  // The paths of synthetic bold glyphs, which are emboldened.
  let mergedBoldPath = ''
  let extra = ''
  let skippedLine = -1
  type DecorationLine = {
    left: number
    top: number
    ascender: number
    width: number
  }
  let decorationLines: Record<number, DecorationLine | null> = {}
  let decorationGlyphs: Record<number, GlyphBox[]> = {}
  let wordBuffer: string | null = null
  let bufferedOffset = 0
  let bufferedRight = 0

  // Lines entirely above or below the image aren't drawn. The margin includes
  // the baseline of the line, glyphs drawn outside of their lines,
  // decorations and strokes. Lines are checked as a whole, as words are only
  // drawn together on the same line.
  const lineBounds =
    inheritedStyle._alwaysDrawn || parentStyle.textShadowOffset
      ? undefined
      : paintBounds
  const lineMargin =
    2 * fontSize +
    ((parentStyle.WebkitTextStrokeWidth as number) || 0) +
    ((inheritedStyle._cullMargin as number) || 0)

  for (let i = 0; i < texts.length; i++) {
    // Skip whitespace and empty characters.
    const layout = wordPositionInLayout[i]
    const nextLayout = wordPositionInLayout[i + 1]

    if (!layout) continue

    let text = texts[i]
    let path: string | null = null
    let isLastDisplayedBeforeEllipsis = false

    const image =
      graphemeImages &&
      Object.prototype.hasOwnProperty.call(graphemeImages, text)
        ? graphemeImages[text]
        : null

    let topOffset = layout.y
    const width = layout.width
    const line = layout.line
    const shouldCollectDecorationBoxes =
      getDecorationLines(parentStyle).includes('underline') &&
      (parentStyle.textDecorationSkipInk || 'auto') !== 'none'

    if (line === skippedLine) {
      continue
    }
    if (
      ellipsisPlan &&
      (line > ellipsisPlan.line || ellipsisPlan.hidden.has(i))
    ) {
      continue
    }
    if (
      lineBounds &&
      isOutside(
        lineBounds,
        0,
        top + layout.y,
        lineBounds.width,
        0,
        lineMargin + Math.abs(baselines[line] || 0)
      )
    ) {
      continue
    }

    // With `justify`, the line is as wide as the container beside the indent.
    const placed = placePiece(layout)
    let leftOffset = placed.leftOffset
    const { extendedWidth, lineLeft } = placed

    const baselineOfLine = baselines[line]
    const baselineOfWord = engine.baseline(text)
    const heightOfWord = engine.height(text)
    const baselineDelta = baselineOfLine - baselineOfWord

    const buildUnderlineBand = (offset: number) => {
      if (!shouldCollectDecorationBoxes) return undefined
      const strokeWidth = getDecorationThickness(parentStyle)
      return {
        underlineY:
          top +
          offset +
          baselineDelta +
          getUnderlineY(parentStyle, baselineOfWord, strokeWidth),
        strokeWidth,
      }
    }

    if (!decorationLines[line]) {
      decorationLines[line] = {
        // With bidi, the first piece may not be on the left of the line.
        left: levels ? lineLeft : leftOffset,
        top: top + topOffset + baselineDelta,
        ascender: baselineOfWord,
        width: extendedWidth
          ? containerWidth - (line === 0 ? textIndentNumber : 0)
          : lineWidths[line],
      }
    }

    // The shaping direction of the piece, guessed from its text without bidi.
    const direction =
      levels === undefined ? undefined : levels[i] % 2 === 1 ? 'rtl' : 'ltr'

    if (ellipsisPlan?.truncated?.index === i) {
      text = ellipsisPlan.truncated.text
      leftOffset = ellipsisPlan.truncated.left
    }

    if (lineLimit !== Infinity && !ellipsisPlan) {
      let _blockEllipsis = blockEllipsis
      let ellipsisWidth = measureGrapheme(blockEllipsis)
      if (ellipsisWidth > parentContainerInnerWidth) {
        _blockEllipsis = HorizontalEllipsis
        ellipsisWidth = measureGrapheme(_blockEllipsis)
      }
      const isNotLastLine = line < lineWidths.length - 1
      const isLastAllowedLine = line + 1 === lineLimit

      function calcEllipsis(baseWidth: number, _text: string) {
        const chars = segment(_text, 'grapheme', locale)

        let subset = ''
        let resolvedWidth = 0

        for (const char of chars) {
          const w = baseWidth + measureGraphemeArray([subset + char])
          if (
            // Keep at least one character at the start of the line:
            // > The first character or atomic inline-level element on a line
            // must be clipped rather than ellipsed.
            // https://drafts.csswg.org/css-overflow/#text-overflow
            (subset || layout.x > 0) &&
            w + ellipsisWidth > parentContainerInnerWidth
          ) {
            break
          }
          subset += char
          resolvedWidth = w
        }

        return {
          subset,
          resolvedWidth,
        }
      }

      if (
        isLastAllowedLine &&
        (isNotLastLine || lineWidths[line] > parentContainerInnerWidth)
      ) {
        // Like in browsers, the last line keeps its words, and characters are
        // only removed when the ellipsis doesn't fit after them.
        // https://drafts.csswg.org/css-overflow-4/#block-ellipsis
        if (
          leftOffset + width + ellipsisWidth > parentContainerInnerWidth ||
          (nextLayout && nextLayout.line !== line)
        ) {
          // Spaces at the end of the line aren't drawn before the ellipsis.
          const { subset, resolvedWidth } = calcEllipsis(
            leftOffset,
            text.replace(/\s+$/, '')
          )

          text = subset + _blockEllipsis
          skippedLine = line
          decorationLines[line].width = Math.max(
            0,
            resolvedWidth - decorationLines[line].left
          )
          isLastDisplayedBeforeEllipsis = true
        }
      }
    }

    if (image) {
      // For images, we remove the baseline offset.
      topOffset += 0
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
        !isLastDisplayedBeforeEllipsis &&
        // Text is only shaped together in one direction, and not with pieces
        // hidden by the ellipsis.
        (levels === undefined ||
          (levels[i] === levels[i + 1] && !ellipsisPlan?.hidden.has(i + 1)))
      ) {
        if (wordBuffer === null) {
          bufferedOffset = leftOffset
          bufferedRight = leftOffset + layout.width
        } else if (levels) {
          // Right-to-left pieces are drawn from the left of the last one.
          bufferedOffset = Math.min(bufferedOffset, leftOffset)
          bufferedRight = Math.max(bufferedRight, leftOffset + layout.width)
        }
        wordBuffer = wordBuffer === null ? text : wordBuffer + text
        continue
      }

      const finalizedSegment = wordBuffer === null ? text : wordBuffer + text
      let finalizedLeftOffset =
        wordBuffer === null ? leftOffset : bufferedOffset
      let finalizedWidth = layout.width + leftOffset - finalizedLeftOffset
      if (levels && wordBuffer !== null) {
        finalizedLeftOffset = Math.min(bufferedOffset, leftOffset)
        finalizedWidth =
          Math.max(bufferedRight, leftOffset + layout.width) -
          finalizedLeftOffset
      }

      const band = buildUnderlineBand(topOffset)

      const svg = engine.getSVG(
        finalizedSegment.replace(/(\t)+/g, ''),
        {
          fontSize,
          left: left + finalizedLeftOffset,
          // Since we need to pass the baseline position, add the ascender to the top.
          top: top + topOffset + baselineOfWord + baselineDelta,
          letterSpacing,
          wordSpacing: wordSpacing as number,
          fontFeatureSettings,
          direction,
        },
        band
      )

      path = svg.path
      mergedBoldPath += svg.boldPath

      if (shouldCollectDecorationBoxes && svg.boxes && svg.boxes.length) {
        ;(decorationGlyphs[line] || (decorationGlyphs[line] = [])).push(
          ...svg.boxes
        )
      }

      wordBuffer = null

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
            'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
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
            'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
          })
      }
    } else {
      // We need manually add the font ascender height to ensure it starts
      // at the baseline because <text>'s alignment baseline is set to `hanging`
      // by default and supported to change in SVG 1.1.
      topOffset += baselineOfWord + baselineDelta

      if (shouldCollectDecorationBoxes && !image) {
        const band = buildUnderlineBand(topOffset)

        const svg = engine.getSVG(
          text.replace(/(\t)+/g, ''),
          {
            fontSize,
            left: left + leftOffset,
            top: top + topOffset,
            letterSpacing,
            wordSpacing: wordSpacing as number,
            fontFeatureSettings,
            direction,
          },
          band
        )

        if (svg.boxes && svg.boxes.length) {
          ;(decorationGlyphs[line] || (decorationGlyphs[line] = [])).push(
            ...svg.boxes
          )
        }
      }
    }

    if (path !== null) {
      mergedPath += path + ' '
    } else {
      const [t, shape] = buildText(
        {
          content: text,
          filter,
          id,
          left: left + leftOffset,
          top: top + topOffset,
          width,
          height: heightOfWord,
          matrix,
          image,
          clipPathId,
          debug,
          shape: !!_inheritedBackgroundClipTextPath,
        },
        parentStyle
      )
      result += t
      backgroundClipDef += shape
    }

    if (isLastDisplayedBeforeEllipsis) {
      break
    }
  }

  if (ellipsisPlan) {
    const { line, text, width, end } = ellipsisPlan
    // At the baseline of the line, in the direction of the line.
    const baselineTop =
      top +
      wordPositionInLayout.find((layout) => layout?.line === line).y +
      baselines[line]
    if (embedFont) {
      const svg = engine.getSVG(text, {
        fontSize,
        left: left + ellipsisPlan.left,
        top: baselineTop,
        letterSpacing,
        wordSpacing: wordSpacing as number,
        fontFeatureSettings,
        direction: isRTL ? 'rtl' : 'ltr',
      })
      mergedPath += svg.path + ' '
      mergedBoldPath += svg.boldPath
    } else {
      const [t, shape] = buildText(
        {
          content: text,
          filter,
          id,
          left: left + ellipsisPlan.left,
          top: baselineTop,
          width,
          height: engine.height(text),
          matrix,
          image: null,
          clipPathId,
          debug,
          shape: !!_inheritedBackgroundClipTextPath,
        },
        parentStyle
      )
      result += t
      backgroundClipDef += shape
    }

    // The decoration ends with the text before the ellipsis.
    const decoration = decorationLines[line]
    if (decoration) {
      const right = decoration.left + decoration.width
      if (isRTL) decoration.left = Math.min(end, right)
      decoration.width = Math.max(0, (isRTL ? right : end) - decoration.left)
    }
  }

  if (getDecorationLines(parentStyle).length) {
    decorationShape = Object.entries(decorationLines)
      .map(([lineIndex, deco]) => {
        if (!deco) return ''
        const glyphBoxes = decorationGlyphs[lineIndex] || []

        return buildDecoration(
          {
            left: left + deco.left,
            top: deco.top,
            width: deco.width,
            ascender: deco.ascender,
            clipPathId,
            matrix,
            glyphBoxes,
          },
          parentStyle
        )
      })
      .join('')
  }

  // The opacity of the parent if it only has this text, see `layout()`. A
  // single path without stroke or filters is one fill operation, so
  // `fill-opacity` looks the same as drawing it as a group with `opacity`,
  // and avoids the compositing surface of a group in rasterizers.
  const textOpacity = (parentStyle._textOpacity as number | undefined) ?? 1
  const fillOpacity =
    textOpacity < 1 &&
    !result &&
    !filter &&
    !cssFilter &&
    !decorationShape &&
    !mergedBoldPath &&
    !getTextStrokeAttributes(parentStyle).stroke
      ? textOpacity
      : undefined

  // Embed the font as path.
  if (mergedPath || mergedBoldPath) {
    const strokeAttributes = getTextStrokeAttributes(parentStyle)
    const path =
      !isFullyTransparent(fillColor) || strokeAttributes.stroke || filter
        ? buildGlyphPaths(
            { path: mergedPath, boldPath: mergedBoldPath },
            {
              fill:
                filter &&
                (isFullyTransparent(fillColor) ||
                  (_inheritedBackgroundClipTextHasBackground &&
                    isOpaqueWhite(fillColor)))
                  ? 'black'
                  : fillColor,
              transform: matrix ? matrix : undefined,
              'fill-opacity': fillOpacity,
              ...strokeAttributes,
            },
            getSyntheticBoldWidth(fontSize),
            id
          )
        : ''
    const p = path
      ? buildXMLString(
          'g',
          {
            mask: overflowMaskId ? `url(#${overflowMaskId})` : undefined,
            'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
          },
          path
        )
      : ''

    if (_inheritedBackgroundClipTextPath) {
      backgroundClipDef = buildXMLString('path', {
        d: mergedPath + mergedBoldPath,
        transform: matrix ? matrix : undefined,
      })
    }

    result +=
      (filter
        ? filter +
          buildXMLString(
            'g',
            { filter: `url(#satori_s-${id})` },
            p + decorationShape
          )
        : p + decorationShape) + extra
  } else if (decorationShape) {
    result += filter
      ? buildXMLString('g', { filter: `url(#satori_s-${id})` }, decorationShape)
      : decorationShape
  }

  if (textOpacity < 1 && fillOpacity === undefined && result) {
    result = buildXMLString('g', { opacity: textOpacity }, result)
  }

  // Hidden text takes up space, but isn't drawn.
  if (parentStyle.visibility === 'hidden') return ''

  // Attach information to the parent node.
  if (backgroundClipDef) {
    ;(parentStyle._inheritedBackgroundClipTextPath as any).value +=
      backgroundClipDef
  }

  return result
}
