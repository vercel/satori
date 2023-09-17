/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */
import type { LayoutContext } from './layout.js'
import type { Yoga } from 'yoga-wasm-web'
import getYoga from './yoga/index.js'
import {
  v,
  segment,
  wordSeparators,
  buildXMLString,
  splitByBreakOpportunities,
  isUndefined,
  isString,
  lengthToNumber,
  isNumber,
} from './utils.js'
import buildText, { container } from './builder/text.js'
import { buildDropShadow } from './builder/shadow.js'
import buildDecoration from './builder/text-decoration.js'
import { Locale } from './language.js'
import { FontEngine } from './font.js'
import { HorizontalEllipsis, Space, Tab } from './characters.js'

const skippedWordWhenFindingMissingFont = new Set([Tab])

function shouldSkipWhenFindingMissingFont(word: string): boolean {
  return skippedWordWhenFindingMissingFont.has(word)
}

export default async function* buildTextNodes(
  content: string,
  context: LayoutContext
): AsyncGenerator<{ word: string; locale?: Locale }[], string, [any, any]> {
  const Yoga = await getYoga()

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
  } = context

  const {
    textAlign,
    whiteSpace,
    wordBreak,
    lineHeight,
    textTransform,
    textWrap,
    fontSize,
    filter: cssFilter,
    tabSize = 8,
    _inheritedBackgroundClipTextPath,
  } = parentStyle

  content = processTextTransform(content, textTransform as string, locale)

  const {
    content: _content,
    shouldCollapseTabsAndSpaces,
    allowSoftWrap,
  } = processWhiteSpace(content, whiteSpace as string)

  const { words, requiredBreaks, allowBreakWord } = processWordBreak(
    _content,
    wordBreak as string
  )

  const [lineLimit, blockEllipsis] = processTextOverflow(
    parentStyle,
    allowSoftWrap
  )

  const textContainer = createTextContainerNode(Yoga, textAlign as string)
  parent.insertChild(textContainer, parent.getChildCount())

  if (isUndefined(parentStyle.flexShrink)) {
    parent.setFlexShrink(1)
  }

  // Get the correct font according to the container style.
  // https://www.w3.org/TR/CSS2/visudet.html
  let engine = font.getEngine(
    fontSize as number,
    lineHeight as number,
    parentStyle as any,
    locale
  )

  // Yield segments that are missing a font.
  const wordsMissingFont = canLoadAdditionalAssets
    ? segment(_content, 'grapheme').filter(
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
    engine = font.getEngine(
      fontSize as number,
      lineHeight as number,
      parentStyle as any,
      locale
    )
  }

  function isImage(s: string): boolean {
    return !!(graphemeImages && graphemeImages[s])
  }

  // We can cache the measured width of each word as the measure function will be
  // called multiple times.
  const measureGrapheme = genMeasureGrapheme(engine, parentStyle)

  function measureGraphemeArray(segments: string[]): number {
    let width = 0

    for (const s of segments) {
      if (isImage(s)) {
        width += fontSize as number
      } else {
        width += measureGrapheme(s)
      }
    }

    return width
  }

  function measureText(text: string): number {
    return measureGraphemeArray(segment(text, 'grapheme'))
  }

  const tabWidth = isString(tabSize)
    ? lengthToNumber(tabSize, fontSize as number, 1, parentStyle)
    : measureGrapheme(Space) * (tabSize as number)

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

    const { index, tabCount } = detectTabs(text)
    let originWidth = 0
    let textBeforeTab = ''

    if (tabCount > 0) {
      textBeforeTab = text.slice(0, index)
      const textAfterTab = text.slice(index + tabCount)
      const textWidthBeforeTab = measureText(textBeforeTab)
      const offsetBeforeTab = textWidthBeforeTab + currentWidth
      const tabMoveDistance =
        tabWidth === 0
          ? textWidthBeforeTab
          : (Math.floor(offsetBeforeTab / tabWidth) + tabCount) * tabWidth
      originWidth = tabMoveDistance + measureText(textAfterTab)
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
  let lineSegmentNumber = []
  let texts = []
  let wordPositionInLayout: (null | {
    x: number
    y: number
    width: number
    line: number
    lineIndex: number
    isImage: boolean
  })[] = []

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
    lineSegmentNumber = [0]
    texts = []
    wordPositionInLayout = []

    // We naively implement the width calculation without proper kerning.
    // @TODO: Support different writing modes.
    // @TODO: Support RTL languages.
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
      } = calc(word, currentWidth)
      word = _word

      w = originWidth
      const lineEndingSpacesWidth = endingSpacesWidth

      // When starting a new line from an empty line, we should push one extra
      // line height.
      if (forceBreak && currentLineHeight === 0) {
        currentLineHeight = engine.height(word)
      }

      const allowedToPutAtBeginning = ',.!?:-@)>]}%#'.indexOf(word[0]) < 0
      const allowedToJustify = !currentWidth

      const willWrap =
        i &&
        allowedToPutAtBeginning &&
        // When determining whether a line break is necessary, the width of the
        // trailing spaces is not included in the calculation, as the end boundary
        // can be closely adjacent to the last non-space character.
        // e.g.
        // 'aaa bbb ccc'
        // When the break line happens at the end of the `bbb`, what we see looks like this
        // |aaa bbb|
        // |ccc    |
        currentWidth + w > width + lineEndingSpacesWidth &&
        allowSoftWrap

      // Need to break the word if:
      // - we have break-word
      // - the word is wider than the container width
      // - the word will be put at the beginning of the line
      const needToBreakWord =
        allowBreakWord && w > width && (!currentWidth || willWrap || forceBreak)

      if (needToBreakWord) {
        // Break the word into multiple segments and continue the loop.
        const chars = segment(word, 'grapheme')
        words.splice(i, 1, ...chars)
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
        // @TODO Lack of support for Japanese spacing
        if (shouldCollapseTabsAndSpaces && word === ' ') {
          w = 0
        }

        lineWidths.push(currentWidth - prevLineEndingSpacesWidth)
        baselines.push(currentBaselineOffset)
        lines++
        height += currentLineHeight
        currentWidth = w
        currentLineHeight = w ? engine.height(word) : 0
        currentBaselineOffset = w ? engine.baseline(word) : 0
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
        const glyphHeight = engine.height(word)
        if (glyphHeight > currentLineHeight) {
          // Use the baseline of the highest segment as the baseline of the line.
          currentLineHeight = glyphHeight
          currentBaselineOffset = engine.baseline(word)
        }
        if (allowedToJustify) {
          lineSegmentNumber[lineSegmentNumber.length - 1]++
        }
      }

      if (allowedToJustify) {
        lineIndex++
      }

      maxWidth = Math.max(maxWidth, currentWidth)

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
        const _texts = segment(word, 'word')

        for (let j = 0; j < _texts.length; j++) {
          const _text = _texts[j]
          let _width = 0
          let _isImage = false

          if (isImage(_text)) {
            _width = fontSize as number
            _isImage = true
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
    }

    // @TODO: Support `line-height`.
    return { width: maxWidth, height }
  }

  // It's possible that the text's measured size is different from the container's
  // size, because the container might have a fixed width or height or being
  // expanded by its parent.
  let measuredTextSize = { width: 0, height: 0 }
  textContainer.setMeasureFunc((containerWidth) => {
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
      flow(r)
      measuredTextSize = { width: r, height }
      return { width: Math.ceil(r), height }
    }
    measuredTextSize = { width, height }
    // This may be a temporary fix, I didn't dig deep into yoga.
    // But when the return value of width here doesn't change (assuming the value of width is 216.9),
    // when we later get the width through `parent.getComputedWidth()`, sometimes it returns 216 and sometimes 217.
    // I'm not sure if this is a yoga bug, but it seems related to the entire page width.
    // So I use Math.ceil.
    return { width: Math.ceil(width), height }
  })

  const [x, y] = yield

  let result = ''
  let backgroundClipDef = ''

  const clipPathId = inheritedStyle._inheritedClipPathId as string | undefined
  const overflowMaskId = inheritedStyle._inheritedMaskId as number | undefined

  const {
    left: containerLeft,
    top: containerTop,
    width: containerWidth,
    height: containerHeight,
  } = textContainer.getComputedLayout()

  const parentContainerInnerWidth =
    parent.getComputedWidth() -
    parent.getComputedPadding(Yoga.EDGE_LEFT) -
    parent.getComputedPadding(Yoga.EDGE_RIGHT) -
    parent.getComputedBorder(Yoga.EDGE_LEFT) -
    parent.getComputedBorder(Yoga.EDGE_RIGHT)

  // Attach offset to the current node.
  const left = x + containerLeft
  const top = y + containerTop

  const { matrix, opacity } = container(
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
    let { textShadowColor, textShadowOffset, textShadowRadius } =
      parentStyle as any
    if (!Array.isArray(parentStyle.textShadowOffset)) {
      textShadowColor = [textShadowColor]
      textShadowOffset = [textShadowOffset]
      textShadowRadius = [textShadowRadius]
    }

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
      }
    )

    filter = buildXMLString('defs', {}, filter)
  }

  let decorationShape = ''
  let mergedPath = ''
  let extra = ''
  let skippedLine = -1
  let decorationLines: Record<number, null | number[]> = {}
  let wordBuffer: string | null = null
  let bufferedOffset = 0

  for (let i = 0; i < texts.length; i++) {
    // Skip whitespace and empty characters.
    const layout = wordPositionInLayout[i]
    const nextLayout = wordPositionInLayout[i + 1]

    if (!layout) continue

    let text = texts[i]
    let path: string | null = null
    let isLastDisplayedBeforeEllipsis = false

    const image = graphemeImages ? graphemeImages[text] : null

    let topOffset = layout.y
    let leftOffset = layout.x
    const width = layout.width
    const line = layout.line

    if (line === skippedLine) {
      continue
    }

    // When `text-align` is `justify`, the width of the line will be adjusted.
    let extendedWidth = false

    if (lineWidths.length > 1) {
      // Calculate alignment. Note that for Flexbox, there is only text
      // alignment when the container is multi-line.
      const remainingWidth = containerWidth - lineWidths[line]
      if (textAlign === 'right' || textAlign === 'end') {
        leftOffset += remainingWidth
      } else if (textAlign === 'center') {
        leftOffset += remainingWidth / 2
      } else if (textAlign === 'justify') {
        // Don't justify the last line.
        if (line < lineWidths.length - 1) {
          const segments = lineSegmentNumber[line]
          const gutter = segments > 1 ? remainingWidth / (segments - 1) : 0
          leftOffset += gutter * layout.lineIndex
          extendedWidth = true
        }
      }
    }

    const baselineOfLine = baselines[line]
    const baselineOfWord = engine.baseline(text)
    const heightOfWord = engine.height(text)
    const baselineDelta = baselineOfLine - baselineOfWord

    if (!decorationLines[line]) {
      decorationLines[line] = [
        leftOffset,
        top + topOffset + baselineDelta,
        baselineOfWord,
        extendedWidth ? containerWidth : lineWidths[line],
      ]
    }

    if (lineLimit !== Infinity) {
      let _blockEllipsis = blockEllipsis
      let ellipsisWidth = measureGrapheme(blockEllipsis)
      if (ellipsisWidth > parentContainerInnerWidth) {
        _blockEllipsis = HorizontalEllipsis
        ellipsisWidth = measureGrapheme(_blockEllipsis)
      }
      const spaceWidth = measureGrapheme(Space)
      const isNotLastLine = line < lineWidths.length - 1
      const isLastAllowedLine = line + 1 === lineLimit

      function calcEllipsis(baseWidth: number, _text: string) {
        const chars = segment(_text, 'grapheme', locale)

        let subset = ''
        let resolvedWidth = 0

        for (const char of chars) {
          const w = baseWidth + measureGraphemeArray([subset + char])
          if (
            // Keep at least one character:
            // > The first character or atomic inline-level element on a line
            // must be clipped rather than ellipsed.
            // https://drafts.csswg.org/css-overflow/#text-overflow
            subset &&
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
        if (
          leftOffset + width + ellipsisWidth + spaceWidth >
          parentContainerInnerWidth
        ) {
          const { subset, resolvedWidth } = calcEllipsis(leftOffset, text)

          text = subset + _blockEllipsis
          skippedLine = line
          decorationLines[line][2] = resolvedWidth
          isLastDisplayedBeforeEllipsis = true
        } else if (nextLayout && nextLayout.line !== line) {
          if (textAlign === 'center') {
            const { subset, resolvedWidth } = calcEllipsis(leftOffset, text)

            text = subset + _blockEllipsis
            skippedLine = line
            decorationLines[line][2] = resolvedWidth
            isLastDisplayedBeforeEllipsis = true
          } else {
            const nextLineText = texts[i + 1]

            const { subset, resolvedWidth } = calcEllipsis(
              width + leftOffset,
              nextLineText
            )

            text = text + subset + _blockEllipsis
            skippedLine = line
            decorationLines[line][2] = resolvedWidth
            isLastDisplayedBeforeEllipsis = true
          }
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
        !isLastDisplayedBeforeEllipsis
      ) {
        if (wordBuffer === null) {
          bufferedOffset = leftOffset
        }
        wordBuffer = wordBuffer === null ? text : wordBuffer + text
        continue
      }

      const finalizedSegment = wordBuffer === null ? text : wordBuffer + text
      const finalizedLeftOffset =
        wordBuffer === null ? leftOffset : bufferedOffset
      const finalizedWidth = layout.width + leftOffset - finalizedLeftOffset

      path = engine.getSVG(finalizedSegment.replace(/(\t)+/g, ''), {
        ...parentStyle,
        left: left + finalizedLeftOffset,
        // Since we need to pass the baseline position, add the ascender to the top.
        top: top + topOffset + baselineOfWord + baselineDelta,
        letterSpacing: parentStyle.letterSpacing,
      })

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
    }

    // Get the decoration shape.
    if (parentStyle.textDecorationLine) {
      const deco = decorationLines[line]
      if (deco && !deco[4]) {
        decorationShape += buildDecoration(
          {
            left: left + deco[0],
            top: deco[1],
            width: deco[3],
            ascender: deco[2],
            clipPathId,
          },
          parentStyle
        )
        deco[4] = 1
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
          opacity,
          image,
          clipPathId,
          debug,
          shape: !!_inheritedBackgroundClipTextPath,
          decorationShape,
        },
        parentStyle
      )
      result += t
      backgroundClipDef += shape
      decorationShape = ''
    }

    if (isLastDisplayedBeforeEllipsis) {
      break
    }
  }

  // Embed the font as path.
  if (mergedPath) {
    const p =
      parentStyle.color !== 'transparent' && opacity !== 0
        ? buildXMLString('path', {
            fill: parentStyle.color,
            d: mergedPath,
            transform: matrix ? matrix : undefined,
            opacity: opacity !== 1 ? opacity : undefined,
            'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
            mask: overflowMaskId ? `url(#${overflowMaskId})` : undefined,

            style: cssFilter ? `filter:${cssFilter}` : undefined,
          })
        : ''

    if (_inheritedBackgroundClipTextPath) {
      backgroundClipDef = buildXMLString('path', {
        d: mergedPath,
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
  }

  // Attach information to the parent node.
  if (backgroundClipDef) {
    ;(parentStyle._inheritedBackgroundClipTextPath as any).value +=
      backgroundClipDef
  }

  return result
}

function processTextTransform(
  content: string,
  textTransform: string,
  locale?: Locale
): string {
  if (textTransform === 'uppercase') {
    content = content.toLocaleUpperCase(locale)
  } else if (textTransform === 'lowercase') {
    content = content.toLocaleLowerCase(locale)
  } else if (textTransform === 'capitalize') {
    content = segment(content, 'word', locale)
      // For each word...
      .map((word) => {
        // ...split into graphemes...
        return segment(word, 'grapheme', locale)
          .map((grapheme, index) => {
            // ...and make the first grapheme uppercase
            return index === 0 ? grapheme.toLocaleUpperCase(locale) : grapheme
          })
          .join('')
      })
      .join('')
  }

  return content
}

function processTextOverflow(
  parentStyle: Record<string, string | number>,
  allowSoftWrap: boolean
): [number, string?] {
  const {
    textOverflow,
    lineClamp,
    WebkitLineClamp,
    WebkitBoxOrient,
    overflow,
    display,
  } = parentStyle

  if (display === 'block' && lineClamp) {
    const [lineLimit, blockEllipsis = HorizontalEllipsis] =
      parseLineClamp(lineClamp)
    if (lineLimit) {
      return [lineLimit, blockEllipsis]
    }
  }

  if (
    textOverflow === 'ellipsis' &&
    display === '-webkit-box' &&
    WebkitBoxOrient === 'vertical' &&
    isNumber(WebkitLineClamp) &&
    WebkitLineClamp > 0
  ) {
    return [WebkitLineClamp, HorizontalEllipsis]
  }

  if (textOverflow === 'ellipsis' && overflow === 'hidden' && !allowSoftWrap) {
    return [1, HorizontalEllipsis]
  }

  return [Infinity]
}

function processWordBreak(content, wordBreak: string) {
  const allowBreakWord = ['break-all', 'break-word'].includes(wordBreak)

  const { words, requiredBreaks } = splitByBreakOpportunities(
    content,
    wordBreak
  )

  return { words, requiredBreaks, allowBreakWord }
}

function processWhiteSpace(content: string, whiteSpace: string) {
  const shouldKeepLinebreak = ['pre', 'pre-wrap', 'pre-line'].includes(
    whiteSpace
  )

  const shouldCollapseTabsAndSpaces = ['normal', 'nowrap', 'pre-line'].includes(
    whiteSpace
  )

  const allowSoftWrap = !['pre', 'nowrap'].includes(whiteSpace)

  if (!shouldKeepLinebreak) {
    content = content.replace(/\n/g, Space)
  }

  if (shouldCollapseTabsAndSpaces) {
    content = content.replace(/([ ]|\t)+/g, Space).trim()
  }

  return { content, shouldCollapseTabsAndSpaces, allowSoftWrap }
}

function createTextContainerNode(
  Yoga: Yoga,
  textAlign: string
): ReturnType<Yoga['Node']['create']> {
  // Create a container node for this text fragment.
  const textContainer = Yoga.Node.create()
  textContainer.setAlignItems(Yoga.ALIGN_BASELINE)
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
        end: Yoga.JUSTIFY_FLEX_END,
      },
      Yoga.JUSTIFY_FLEX_START,
      'textAlign'
    )
  )

  return textContainer
}

function genMeasureGrapheme(
  engine: FontEngine,
  parentStyle: any
): (s: string) => number {
  const cache = new Map<string, number>()

  return function measureGrapheme(s: string): number {
    if (cache.has(s)) {
      return cache.get(s)
    }

    const width = engine.measure(s, parentStyle)
    cache.set(s, width)

    return width
  }
}

function detectTabs(text: string):
  | {
      index: null
      tabCount: 0
    }
  | {
      index: number
      tabCount: number
    } {
  const result = /(\t)+/.exec(text)
  return result
    ? {
        index: result.index,
        tabCount: result[0].length,
      }
    : {
        index: null,
        tabCount: 0,
      }
}

function parseLineClamp(input: number | string): [number?, string?] {
  if (typeof input === 'number') return [input]

  const regex1 = /^(\d+)\s*"(.*)"$/
  const regex2 = /^(\d+)\s*'(.*)'$/
  const match1 = regex1.exec(input)
  const match2 = regex2.exec(input)

  if (match1) {
    const number = +match1[1]
    const text = match1[2]

    return [number, text]
  } else if (match2) {
    const number = +match2[1]
    const text = match2[2]

    return [number, text]
  }

  return []
}
