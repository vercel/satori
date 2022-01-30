/**
 * This module calculates the layout of a text string. Currently the only
 * supported inline node is text. All other nodes are using block layout.
 */

// @TODO: Handle `text-align` options other than `left`.

import Yoga from 'yoga-layout-prebuilt'
import { LineBreaker } from 'css-line-break'

import type { LayoutContext } from './layout'
import text from './builder/text'

export default function* buildTextNodes(content, context: LayoutContext) {
  const { parentStyle, parent, font } = context

  const breaker = LineBreaker(content, {
    lineBreak: 'strict',
    wordBreak: 'normal',
  })

  const words = []
  for (let br; !(br = breaker.next()).done; ) {
    words.push(br.value.slice())
  }

  const nodes = []

  for (const word of words) {
    const node = Yoga.Node.create()
    parent.insertChild(node, parent.getChildCount())

    const measured = font.measure(word, parentStyle as any)

    node.setWidth(measured.width)
    node.setHeight((measured.ascent + measured.descent) * 1.2)

    nodes.push(node)
  }

  const [x, y] = yield

  let result = ''

  for (let i = 0; i < nodes.length; i++) {
    let { left, top, width, height } = nodes[i].getComputedLayout()

    // Attach offset to the current node.
    left += x
    top += y + height

    result += text({ left, top, width, height, content: words[i] }, parentStyle)
  }

  return result
}
