/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */
import type { LayoutContext } from './layout'

import getYoga from './yoga'
import { v, segment, wordSeparators, buildXMLString } from './utils'
import text, { container } from './builder/text'
import shadow from './builder/shadow'

// @TODO: Support "lang" attribute to modify the locale
const locale = undefined

export default function* buildTextNodes(
  content: string,
  context: LayoutContext
) {
  const Yoga = getYoga()

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
  } = context

  if (parentStyle.textTransform === 'uppercase') {
    content = content.toLocaleUpperCase(locale)
  } else if (parentStyle.textTransform === 'lowercase') {
    content = content.toLocaleLowerCase(locale)
  } else if (parentStyle.textTransform === 'capitalize') {
    content = segment(content, 'word')
      // For each word...
      .map((word) => {
        // ...split into graphemes...
        return segment(word, 'grapheme')
          .map((grapheme, index) => {
            // ...and make the first grapheme uppercase
            return index === 0 ? grapheme.toLocaleUpperCase(locale) : grapheme
          })
          .join('')
      })
      .join('')
  }

  const segmenter = v(
    parentStyle.wordBreak,
    {
      normal: 'word',
      'break-all': 'grapheme',
      'break-word': 'grapheme',
      'keep-all': 'word',
    },
    'word'
  )

  const words = segment(content, segmenter)

  // Create a container node for this text fragment.
  const textContainer = Yoga.Node.create()
  textContainer.setAlignItems(Yoga.ALIGN_BASELINE)
  if (parentStyle.textAlign === 'left') {
    textContainer.setJustifyContent(Yoga.JUSTIFY_FLEX_START)
  } else if (parentStyle.textAlign === 'center') {
    textContainer.setJustifyContent(Yoga.JUSTIFY_CENTER)
  } else if (parentStyle.textAlign === 'right') {
    textContainer.setJustifyContent(Yoga.JUSTIFY_FLEX_END)
  } else if (parentStyle.textAlign === 'justify') {
    textContainer.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN)
  }

  parent.insertChild(textContainer, parent.getChildCount())

  // Get the correct font according to the container style.
  // @TODO: Support font family fallback based on the glyphs of the font.
  const resolvedFont = font.getFont(parentStyle as any)
  const ascender =
    (resolvedFont.ascender / resolvedFont.unitsPerEm) *
    (parentStyle.fontSize as number)
  const descender =
    -(resolvedFont.descender / resolvedFont.unitsPerEm) *
    (parentStyle.fontSize as number)
  const glyphHeight = ascender + descender
  const lineHeight = glyphHeight * 1.2
  const deltaHeight = ((parentStyle.fontSize as number) - glyphHeight) / 2

  const {
    textAlign,
    textOverflow,
    whiteSpace,
    _inheritedBackgroundClipTextPath,
  } = parentStyle

  // Compute the layout.
  // @TODO: Use segments instead of words to properly support kerning.
  let lineWidth = []
  let lineSegmentNumber = []
  let wordsInLayout: (null | {
    x: number
    y: number
    width: number
    line: number
    lineIndex: number
  })[] = []

  // We can cache the measured width of each word as the measure function will be
  // called multiple times.
  const wordWidthCache = new Map<string, number>()
  const measureWithCache = (str: string) => {
    if (wordWidthCache.has(str)) {
      return wordWidthCache.get(str)
    }
    const width = font.measure(resolvedFont, str, parentStyle as any)
    wordWidthCache.set(str, width)
    return width
  }

  // Calculate the minimal possible width of the parent container so it don't
  // shrink below the content.
  let minWidth = 0
  let remainingSegment = ''
  let extraWidth = 0
  for (const word of words) {
    let breakSegment = false
    const isImage = graphemeImages && graphemeImages[word]
    if (isImage || (whiteSpace !== 'nowrap' && wordSeparators.includes(word))) {
      breakSegment = true
    }

    if (!breakSegment) {
      remainingSegment += word
    } else {
      if (whiteSpace === 'nowrap') {
        extraWidth +=
          measureWithCache(remainingSegment) + (parentStyle.fontSize as number)
      } else {
        minWidth = Math.max(minWidth, measureWithCache(remainingSegment))
        if (isImage) {
          minWidth = Math.max(minWidth, parentStyle.fontSize as number)
        }
      }
      remainingSegment = ''
    }
  }
  minWidth = Math.max(minWidth, measureWithCache(remainingSegment) + extraWidth)
  const currentMinWidth = parent.getMinWidth()
  const currentMaxWidth = parent.getMaxWidth()
  const currentWidth = parent.getWidth()
  if (
    isNaN(currentWidth.value) &&
    (isNaN(currentMinWidth.value) ||
      (currentMinWidth.unit === 1 && currentMinWidth.value > minWidth))
  ) {
    // minWidth cannot be larger than maxWidth
    if (!isNaN(currentMaxWidth.value)) {
      if (currentMaxWidth.unit === 1) {
        minWidth = Math.min(minWidth, currentMaxWidth.value)
      } else {
        // @TODO: Support percentage units.
      }
    }
    parent.setMinWidth(minWidth)
  }
  if (typeof parentStyle.flexShrink === 'undefined') {
    parent.setFlexShrink(1)
  }

  textContainer.setMeasureFunc((width) => {
    let lines = 0
    let remainingSpace = ''
    let remainingSpaceWidth = 0
    let currentWidth = 0
    let maxWidth = 0
    let lineIndex = -1

    lineWidth = []
    lineSegmentNumber = [0]

    // We naively implement the width calculation without proper kerning.
    // @TODO: Support cases like `white-space: pre` and `pre-wrap`.
    // @TODO: Support different writing modes.
    // @TODO: Support RTL languages.
    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      if (wordSeparators.includes(word)) {
        remainingSpace += word
        remainingSpaceWidth = measureWithCache(remainingSpace)

        wordsInLayout[i] = null
      } else {
        const w =
          graphemeImages && graphemeImages[word]
            ? (parentStyle.fontSize as number)
            : measureWithCache(word)

        // This is the start of the line, we can ignore all spaces here.
        if (!currentWidth) {
          remainingSpace = ''
          remainingSpaceWidth = 0
        }

        const allowedToPutAtBeginning =
          remainingSpaceWidth || ',.!?:-@)>]}%#'.indexOf(word[0]) < 0
        const allowedToJustify = !currentWidth || !!remainingSpaceWidth

        if (
          i &&
          allowedToPutAtBeginning &&
          currentWidth + remainingSpaceWidth + w > width &&
          whiteSpace !== 'nowrap'
        ) {
          // Start a new line, spaces can be ignored.
          lineWidth.push(currentWidth)
          lines++
          currentWidth = w
          lineSegmentNumber.push(1)
          lineIndex = -1
        } else {
          // It fits into the current line.
          currentWidth += remainingSpaceWidth + w
          if (allowedToJustify) {
            lineSegmentNumber[lineSegmentNumber.length - 1]++
          }
        }

        remainingSpace = ''
        remainingSpaceWidth = 0

        if (allowedToJustify) {
          lineIndex++
        }

        maxWidth = Math.max(maxWidth, currentWidth)
        wordsInLayout[i] = {
          y: lines * lineHeight - deltaHeight,
          x: currentWidth - w,
          width: w,
          line: lines,
          lineIndex,
        }
      }
    }
    if (currentWidth) {
      lines++
      lineWidth.push(currentWidth)
    }

    // If there are multiple lines, we need to stretch it to fit the container.
    if (lines > 1) {
      maxWidth = Math.max(maxWidth, width)
    }

    // @TODO: Support `line-height`.
    return { width: maxWidth, height: lines * lineHeight }
  })

  const [x, y] = yield

  let result = ''
  let backgroundClipDef = ''

  const clipPathId = inheritedStyle._inheritedClipPathId as number | undefined
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
    filter = shadow(
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

  let mergedPath = ''
  let skippedLine = -1
  let ellipsisWidth = textOverflow === 'ellipsis' ? measureWithCache('…') : 0
  let spaceWidth = textOverflow === 'ellipsis' ? measureWithCache(' ') : 0

  for (let i = 0; i < words.length; i++) {
    // Skip whitespace.
    if (!wordsInLayout[i]) continue
    const layout = wordsInLayout[i]

    let word = words[i]
    let path: string | null = null

    const image = graphemeImages ? graphemeImages[word] : null

    let topOffset = layout.y
    let leftOffset = layout.x
    const width = layout.width
    const line = layout.line

    if (line === skippedLine) continue

    if (lineWidth.length > 1) {
      // Calculate alignment. Note that for flexbox, there is only text
      // alignment when the container is multi-line.
      const remainingWidth = containerWidth - lineWidth[line]
      if (textAlign === 'right' || textAlign === 'end') {
        leftOffset += remainingWidth
      } else if (textAlign === 'center') {
        leftOffset += remainingWidth / 2
      } else if (textAlign === 'justify') {
        // Don't justify the last line.
        if (line < lineWidth.length - 1) {
          const segments = lineSegmentNumber[line]
          const gutter = segments > 1 ? remainingWidth / (segments - 1) : 0
          leftOffset += gutter * layout.lineIndex
        }
      }
    }

    if (textOverflow === 'ellipsis') {
      if (lineWidth[line] > parentContainerInnerWidth) {
        if (
          layout.x + width + ellipsisWidth + spaceWidth >
          parentContainerInnerWidth
        ) {
          const chars = segment(word, 'grapheme')
          let subset = ''
          for (const char of chars) {
            if (
              // Keep at least one character:
              // > The first character or atomic inline-level element on a line
              // must be clipped rather than ellipsed.
              // https://drafts.csswg.org/css-overflow/#text-overflow
              subset &&
              layout.x + measureWithCache(subset + char) + ellipsisWidth >
                parentContainerInnerWidth
            ) {
              break
            }
            subset += char
          }
          word = subset + '…'
          skippedLine = line
        }
      }
    }

    if (image) {
      // For images, we remove the baseline offset.
      topOffset += deltaHeight
    } else if (embedFont) {
      path = font.getSVG(resolvedFont, word, {
        ...parentStyle,
        left: left + leftOffset,
        // Since we need to pass the baseline position, add the ascender to the top.
        top: top + topOffset + ascender,
        letterSpacing: parentStyle.letterSpacing,
      } as any)
    } else {
      // We need manually add the font ascender height to ensure it starts
      // at the baseline because <text>'s alignment baseline is set to `hanging`
      // by default and supported to change in SVG 1.1.
      topOffset += ascender
    }

    if (path) {
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
          height: lineHeight,
          matrix,
          opacity,
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
  }

  // Embed the font as path.
  if (mergedPath) {
    let extra = ''
    if (debug) {
      extra = buildXMLString('rect', {
        x: left,
        y: top,
        width: containerWidth,
        height: containerHeight,
        fill: 'transparent',
        stroke: '#575eff',
        'stroke-width': 1,
        transform: matrix ? matrix : undefined,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
      })
    }

    const p =
      parentStyle.color !== 'transparent' && opacity !== 0
        ? buildXMLString('path', {
            fill: parentStyle.color,
            d: mergedPath,
            transform: matrix ? matrix : undefined,
            opacity: opacity !== 1 ? opacity : undefined,
            'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
          })
        : ''

    if (!!_inheritedBackgroundClipTextPath) {
      backgroundClipDef = buildXMLString('path', {
        d: mergedPath,
        transform: matrix ? matrix : undefined,
      })
    }

    result +=
      (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
      p +
      (filter ? '</g>' : '') +
      extra
  }

  // Attach information to the parent node.
  if (backgroundClipDef) {
    ;(parentStyle._inheritedBackgroundClipTextPath as any).value +=
      backgroundClipDef
  }

  return result
}
