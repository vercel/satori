/**
 * This module is used to calculate the layout of the current sub-tree.
 */

import type { ReactNode } from 'react'

import Yoga from 'yoga-layout-prebuilt'
import { isReactElement, isClass } from './utils'
import handler from './handler'
import FontLoader from './font'

interface LayoutContext {
  id: number
  inheritedStyle: Record<string, number | string>
  parent: Yoga.YogaNode
  font: FontLoader
}

export default function* layout(
  element: ReactNode,
  context: LayoutContext
): Generator<undefined, string> {
  const { id, inheritedStyle, parent, font } = context

  // 1. Pre-process the node.
  if (element === null || typeof element === 'undefined') {
    yield
    return ''
  }

  // Process as text node.
  if (!isReactElement(element)) {
    const content = String(element)

    const node = Yoga.Node.create()
    parent.insertChild(node, parent.getChildCount())

    const measured = font.measure(content, {
      ...inheritedStyle,
      name: inheritedStyle.fontFamily,
    } as any)

    node.setDisplay(Yoga.DISPLAY_FLEX)
    node.setWidth(measured.width)
    node.setHeight((measured.ascent + measured.descent) * 1.2)

    yield

    const { left, top, width, height } = node.getComputedLayout()
    return `<text x="${left}" y="${top}" width="${width}" height="${height}">${content}</text>`
  }

  // Process as element.
  const { type, props } = element
  const { style, children } = props

  if (typeof type === 'function') {
    if (isClass(type)) {
      throw new Error('Class component is not supported.')
    }
    // If it's a custom component, Satori strictly requires it to be pure,
    // stateless, and not relying on any React APIs such as hooks or suspense.
    // So we can safely evaluate it to render. Otherwise, an error will be
    // thrown by React.
    const iter = layout((type as Function)(props), context)
    iter.next().value
    yield
    return iter.next().value
  }

  const node = Yoga.Node.create()
  parent.insertChild(node, parent.getChildCount())

  const newInheritableStyle = handler(node, type, {
    ...inheritedStyle,
    ...style,
  })

  // 2. Do layout recursively for its children.
  const normalizedChildren =
    typeof children === 'undefined' ? [] : [].concat(children)
  const iterators: Generator<undefined, string>[] = []

  for (const child of normalizedChildren) {
    const iter = layout(child, {
      id,
      inheritedStyle: newInheritableStyle,
      parent: node,
      font,
    })
    iter.next()
    iterators.push(iter)
  }

  yield

  // 3. Post-process the node.
  let result = ''
  for (const iter of iterators) {
    result += iter.next().value
  }

  const { left, top, width, height } = node.getComputedLayout()

  result = `<${type} x="${left}" y="${top}" width="${width}" height="${height}">\n${result}\n</${type}>`

  return result
}
