/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */
import type { LayoutContext } from './layout'

import getYoga from './yoga'
import { v, segment, wordSeparators } from './utils'
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

  const { textAlign } = parentStyle

  // Compute the layout.
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
          allowedToPutAtBeginning &&
          currentWidth + remainingSpaceWidth + w > width
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
      maxWidth = width
    }

    // @TODO: Support `line-height`.
    return { width: maxWidth, height: lines * lineHeight }
  })

  const [x, y] = yield

  let result = ''

  const {
    left: containerLeft,
    top: containerTop,
    width: containerWidth,
    height: containerHeight,
  } = textContainer.getComputedLayout()

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

  for (let i = 0; i < words.length; i++) {
    // Skip whitespace.
    if (!wordsInLayout[i]) continue

    const word = words[i]

    let path: string | null = null
    let image: string | null = null

    let topOffset = wordsInLayout[i].y
    let leftOffset = wordsInLayout[i].x
    const width = wordsInLayout[i].width
    const line = wordsInLayout[i].line

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
          leftOffset += gutter * wordsInLayout[i].lineIndex
        }
      }
    }

    if (graphemeImages && graphemeImages[word]) {
      image = graphemeImages[word]
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
      result += text(
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
          debug,
        },
        parentStyle
      )
    }
  }

  // Embed the font as path.
  if (mergedPath) {
    let extra = ''
    if (debug) {
      extra = `<rect x="${left}" y="${top}" width="${containerWidth}" height="${containerHeight}" fill="transparent" stroke="#575eff" stroke-width="1" ${
        matrix ? `transform="${matrix}"` : ''
      }></rect>`
    }

    result += `${
      filter ? `${filter}<g filter="url(#satori_s-${id})">` : ''
    }<path fill="${parentStyle.color}" ${
      matrix ? `transform="${matrix}"` : ''
    } ${opacity !== 1 ? `opacity="${opacity}"` : ''} d="${mergedPath}"></path>${
      filter ? '</g>' : ''
    }${extra}`
  }

  return result
}
