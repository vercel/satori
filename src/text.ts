/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */
import type { LayoutContext } from './layout.js'

import getYoga from './yoga/index.js'
import { v, segment, wordSeparators, buildXMLString, splitByBreakOpportunities } from './utils.js'
import text, { container } from './builder/text.js'
import { dropShadow } from './builder/shadow.js'
import decoration from './builder/text-decoration.js'
import {Locale} from './language.js';

export default async function* buildTextNodes(
  content: string,
  context: LayoutContext
): AsyncGenerator<{word: string, locale?: Locale}[], string, [any, any]> {
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
    textOverflow,
    whiteSpace,
    wordBreak,
    lineHeight,
    filter: cssFilter,
    _inheritedBackgroundClipTextPath,
  } = parentStyle

  if (parentStyle.textTransform === 'uppercase') {
    content = content.toLocaleUpperCase(locale)
  } else if (parentStyle.textTransform === 'lowercase') {
    content = content.toLocaleLowerCase(locale)
  } else if (parentStyle.textTransform === 'capitalize') {
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

  const shouldKeepLinebreak = ['pre', 'pre-wrap', 'pre-line'].includes(
    whiteSpace as string
  )
  const shouldCollapseWhitespace = !['pre', 'pre-wrap'].includes(
    whiteSpace as string
  )

  if (!shouldKeepLinebreak) {
    content = content.replace(/\n/g, ' ')
  }

  if (shouldCollapseWhitespace) {
    content = content.replace(/[ ]+/g, ' ')
    content = content.trim()
  }

  const isBreakWord = wordBreak === 'break-word'
  const isBreakAll = wordBreak === 'break-all'
  const { words, requiredBreaks } = splitByBreakOpportunities(content, isBreakAll)

  // Create a container node for this text fragment.
  const textContainer = Yoga.Node.create()
  textContainer.setAlignItems(Yoga.ALIGN_BASELINE)
  textContainer.setJustifyContent(
    v(
      parentStyle.textAlign,
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
  parent.insertChild(textContainer, parent.getChildCount())

  const baseFontSize = parentStyle.fontSize as number

  // Get the correct font according to the container style.
  // https://www.w3.org/TR/CSS2/visudet.html
  let engine = font.getEngine(
    baseFontSize,
    lineHeight as number,
    parentStyle as any,
    locale
  )

  // Yield segments that are missing a font.
  const wordsMissingFont = canLoadAdditionalAssets
    ? segment(content, 'grapheme').filter((word) => !engine.has(word))
    : []

  yield wordsMissingFont.map(word => {
    return {
      word,
      locale
    }
  })

  if (wordsMissingFont.length) {
    // Reload the engine with additional fonts.
    engine = font.getEngine(
      baseFontSize,
      lineHeight as number,
      parentStyle as any,
      locale
    )
  }

  // Compute the layout.
  // @TODO: Use segments instead of words to properly support kerning.
  let lineWidths = []
  let baselines = []
  let lineSegmentNumber = []
  let wordPositionInLayout: (null | {
    x: number
    y: number
    width: number
    line: number
    lineIndex: number
  })[] = []

  // We can cache the measured width of each word as the measure function will be
  // called multiple times.
  const wordWidthCache = new Map<string, number>()

  function getWordWidthWithCache(s): number {
    if (wordWidthCache.has(s)) {
      return wordWidthCache.get(s)
    }

    const width = engine.measure(s, parentStyle as any)
    wordWidthCache.set(s, width)

    return width
  }

  function measureWithCache(segments: string[]): {
    width: number
    isImage: boolean
  } {
    let width = 0
    let isImage = false

    for (const s of segments) {
      if (graphemeImages && graphemeImages[s]) {
        width += parentStyle.fontSize as number
        isImage = true
      } else {
        width += getWordWidthWithCache(s)
      }
    }
    return { width, isImage }
  }

  const calc = (_words: string): {
    originWidth: number
    endingSpacesWidth: number
    isImage: boolean
  } => {
    if (_words.length === 0) return {
      originWidth: 0,
      endingSpacesWidth: 0,
      isImage: false
    }

    const { width: originWidth, isImage } = measureWithCache(segment(_words, 'grapheme'))
    const { width: afterTrimEndWidth } = measureWithCache(segment(_words.trimEnd(), 'grapheme'))

    return {
      originWidth,
      endingSpacesWidth: originWidth - afterTrimEndWidth,
      isImage
    }
  }

  // Calculate the minimal possible width of the parent container so it don't
  // shrink below the content.
  let remainingSegment = []
  let extraWidth = 0
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    let breakSegment = false
    const isImage = graphemeImages && graphemeImages[word]
    if (whiteSpace === 'pre') {
      // For `pre`, only break the line for `\n`.
      breakSegment = requiredBreaks[i]
    } else if (whiteSpace !== 'nowrap') {
      // For `normal`, `pre-wrap`, `pre-line` we can wrap with any word separators or
      // images.
      if (isImage || requiredBreaks[i]) {
        breakSegment = true
      }
    }
    if (!breakSegment) {
      if (!wordSeparators.includes(word[0]) || !remainingSegment.length) {
        remainingSegment.push(word === '\n' ? ' ' : word)
      }
    } else {
      if (whiteSpace === 'nowrap') {
        extraWidth +=
          measureWithCache(remainingSegment).width + (parentStyle.fontSize as number)
      }
      remainingSegment = []
    }
  }

  if (typeof parentStyle.flexShrink === 'undefined') {
    parent.setFlexShrink(1)
  }

  textContainer.setMeasureFunc((width) => {
    let lines = 0
    let _currentWidth = 0
    let maxWidth = 0
    let lineIndex = -1
    let height = 0
    let currentLineHeight = 0
    let currentBaselineOffset = 0

    lineWidths = []
    lineSegmentNumber = [0]

    // We naively implement the width calculation without proper kerning.
    // @TODO: Support different writing modes.
    // @TODO: Support RTL languages.
    for (let i = 0; i < words.length; i++) {
      let word = words[i]
      const forceBreak = shouldKeepLinebreak && requiredBreaks[i]

      let w = 0
      let lineEndingSpacesWidth = 0

      const {
        originWidth,
        endingSpacesWidth,
        isImage
      } = calc(word)

      w = originWidth
      lineEndingSpacesWidth = endingSpacesWidth

      // When starting a new line from an empty line, we should push one extra
      // line height.
      if (forceBreak && currentLineHeight === 0) {
        currentLineHeight = engine.height(word)
      }

      const allowedToPutAtBeginning = ',.!?:-@)>]}%#'.indexOf(word[0]) < 0
      const allowedToJustify = !_currentWidth

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
        _currentWidth + w > width + lineEndingSpacesWidth &&
        whiteSpace !== 'nowrap' &&
        whiteSpace !== 'pre'

      // Need to break the word if:
      // - we have break-word
      // - the word is wider than the container width
      // - the word will be put at the beginning of the line
      const needToBreakWord =
        isBreakWord && w > width && (!_currentWidth || willWrap || forceBreak)

      if (needToBreakWord) {
        // Break the word into multiple segments and continue the loop.
        const chars = segment(word, 'grapheme')
        words.splice(i, 1, '', ...chars)
        if (_currentWidth > 0) {
          // Start a new line, spaces can be ignored.
          lineWidths.push(_currentWidth)
          baselines.push(currentBaselineOffset)
          lines++
          height += currentLineHeight
          _currentWidth = 0
          currentLineHeight = 0
          currentBaselineOffset = 0
          lineSegmentNumber.push(1)
          lineIndex = -1
        }
        continue
      }
      if (forceBreak || willWrap) {
        // Start a new line, spaces can be ignored.
        // @TODO Lack of support for Japanese spacing
        if (shouldCollapseWhitespace && word === ' ') {
          w = 0
        }
        lineWidths.push(_currentWidth)
        baselines.push(currentBaselineOffset)
        lines++
        height += currentLineHeight
        _currentWidth = w
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
        _currentWidth += w
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

      maxWidth = Math.max(maxWidth, _currentWidth)
      wordPositionInLayout[i] = {
        y: height,
        x: _currentWidth - w,
        width: isImage ? originWidth - endingSpacesWidth : w,
        line: lines,
        lineIndex,
      }
    }
    if (_currentWidth) {
      lines++
      lineWidths.push(_currentWidth)
      baselines.push(currentBaselineOffset)
      height += currentLineHeight
    }

    // @TODO: Support `line-height`.
    return { width: maxWidth, height }
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
    filter = dropShadow(
      {
        width: containerWidth,
        height: containerHeight,
        id,
      },
      {
        shadowColor: parentStyle.textShadowColor,
        shadowOffset: parentStyle.textShadowOffset,
        shadowRadius: parentStyle.textShadowRadius,
      }
    )
  }

  let decorationShape = ''
  let mergedPath = ''
  let extra = ''
  let skippedLine = -1
  let ellipsisWidth = textOverflow === 'ellipsis' ? measureWithCache(['…']).width : 0
  let spaceWidth = textOverflow === 'ellipsis' ? measureWithCache([' ']).width : 0
  let decorationLines: Record<number, null | number[]> = {}
  let wordBuffer: string | null = null
  let bufferedOffset = 0

  for (let i = 0; i < words.length; i++) {
    // Skip whitespace and empty characters.
    const layout = wordPositionInLayout[i]

    if (!layout) continue

    let word = words[i]
    let path: string | null = null
    let islastDisplayedBeforeEllipsis = false

    const image = graphemeImages ? graphemeImages[segment(word, 'grapheme')[0]] : null

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

    if (!decorationLines[line]) {
      decorationLines[line] = [
        leftOffset,
        extendedWidth ? containerWidth : lineWidths[line],
      ]
    }

    if (textOverflow === 'ellipsis') {
      if (lineWidths[line] > parentContainerInnerWidth) {
        if (
          layout.x + width + ellipsisWidth + spaceWidth >
          parentContainerInnerWidth
        ) {
          const chars = segment(word, 'grapheme', locale)
          let subset = ''
          let resolvedWidth = 0
          for (const char of chars) {
            const w = layout.x + measureWithCache([subset + char]).width
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
          word = subset + '…'
          skippedLine = line
          decorationLines[line][1] = resolvedWidth
          islastDisplayedBeforeEllipsis = true
        }
      }
    }

    const baselineOfLine = baselines[line]
    const baselineOfWord = engine.baseline(word)
    const heightOfWord = engine.height(word)
    const baselineDelta = baselineOfLine - baselineOfWord
    if (image) {
      // For images, we remove the baseline offset.
      topOffset += 0
    } else if (embedFont) {
      // If the current word and the next word are on the same line, we try to
      // merge them together to better handle the kerning.
      if (
        !wordSeparators.includes(word) &&
        words[i + 1] &&
        !graphemeImages[segment(words[i + 1], 'grapheme')[0]] &&
        wordPositionInLayout[i + 1] &&
        topOffset === wordPositionInLayout[i + 1].y &&
        !islastDisplayedBeforeEllipsis
      ) {
        if (wordBuffer === null) {
          bufferedOffset = leftOffset
        }
        wordBuffer = wordBuffer === null ? word : wordBuffer + word
        continue
      }

      const finalizedSegment = wordBuffer === null ? word : wordBuffer + word
      const finalizedLeftOffset =
        wordBuffer === null ? leftOffset : bufferedOffset
      const finalizedWidth = layout.width + leftOffset - finalizedLeftOffset

      path = engine.getSVG(finalizedSegment, {
        ...parentStyle,
        left: left + finalizedLeftOffset,
        // Since we need to pass the baseline position, add the ascender to the top.
        top: top + topOffset + baselineOfWord + baselineDelta,
        letterSpacing: parentStyle.letterSpacing,
      } as any)

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
      // If it's the last word in the current line.
      if (line !== wordPositionInLayout[i + 1]?.line || skippedLine === line) {
        const deco = decorationLines[line]
        if (deco && !deco[2]) {
          decorationShape += decoration(
            {
              left: left + deco[0],
              top: top + heightOfWord * +line,
              width: deco[1],
              ascender: engine.baseline(word),
              clipPathId,
            },
            parentStyle
          )
          deco[2] = 1
        }
      }
    }

    if (path !== null) {
      mergedPath += path + ' '
    } else {
      const [t, shape] = text(
        {
          content: word,
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
