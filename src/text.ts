/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */
import type { LayoutContext } from './layout'

import getYoga from './yoga'
import { v } from './utils'
import text from './builder/text'
import shadow from './builder/shadow'

export default function* buildTextNodes(content, context: LayoutContext) {
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

  const granularity = v(
    parentStyle.wordBreak,
    {
      normal: 'word',
      'break-all': 'grapheme',
      'break-word': 'grapheme',
      'keep-all': 'word',
    },
    'word'
  )

  // @ts-ignore
  const segmenter = new Intl.Segmenter('en', { granularity })
  const words = [...segmenter.segment(content)].map((seg) => seg.segment)

  const nodes = []

  // @TODO: Find a better way to avoid overriding the parent node.
  parent.setAlignItems(Yoga.ALIGN_BASELINE)
  if (parentStyle.textAlign === 'left') {
    parent.setJustifyContent(Yoga.JUSTIFY_FLEX_START)
  } else if (parentStyle.textAlign === 'center') {
    parent.setJustifyContent(Yoga.JUSTIFY_CENTER)
  } else if (parentStyle.textAlign === 'right') {
    parent.setJustifyContent(Yoga.JUSTIFY_FLEX_END)
  } else if (parentStyle.textAlign === 'justify') {
    parent.setJustifyContent(Yoga.JUSTIFY_SPACE_BETWEEN)
  }

  const resolvedFont = font.getFont(parentStyle as any)

  for (const word of words) {
    const node = Yoga.Node.create()
    parent.insertChild(node, parent.getChildCount())

    let measured
    if (graphemeImages && graphemeImages[word]) {
      measured = {
        width: parentStyle.fontSize as number,
        ascent:
          (resolvedFont.ascender / resolvedFont.unitsPerEm) *
          (parentStyle.fontSize as number),
        descent:
          -(resolvedFont.descender / resolvedFont.unitsPerEm) *
          (parentStyle.fontSize as number),
      }
    } else {
      measured = font.measure(resolvedFont, word, parentStyle as any)
    }

    node.setWidth(measured.width)
    node.setHeight(measured.ascent * 1.2)
    node.setMargin(Yoga.EDGE_BOTTOM, measured.descent * 1.2)

    nodes.push(node)
  }

  const [x, y] = yield

  let result = ''

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const word = words[i]
    if (parentStyle.position === 'absolute') {
      node.calculateLayout()
    }

    let { left, top, width, height } = node.getComputedLayout()

    // Attach offset to the current node.
    left += x
    top += y

    let path: string | null = null
    let image: string | null = null

    if (graphemeImages && graphemeImages[word]) {
      image = graphemeImages[word]
    } else if (embedFont) {
      path = font.getSVG(resolvedFont, word, {
        ...parentStyle,
        top,
        left,
        letterSpacing: parentStyle.letterSpacing,
      } as any)
    } else {
      // We need manually add the font ascender height to ensure it starts
      // at the baseline because <text>'s alignment baseline is set to `hanging`
      // by default and supported to change in SVG 1.1.
      top += font.getAscent(resolvedFont, parentStyle as any)
    }

    let filter = ''
    if (parentStyle.textShadowOffset) {
      filter = shadow(
        { width, height, id },
        {
          shadowColor: parentStyle.textShadowColor,
          shadowOffset: parentStyle.textShadowOffset,
          shadowRadius: parentStyle.textShadowRadius,
        }
      )
    }

    result += text(
      {
        content: word,
        filter,
        id,
        left,
        top,
        width,
        height,
        isInheritingTransform,
        path,
        image,
        debug,
      },
      parentStyle
    )
  }

  return result
}
