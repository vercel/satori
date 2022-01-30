/**
 * This module is used to calculate the layout of the current sub-tree.
 */

import type { ReactNode } from 'react'
import type { YogaNode } from 'yoga-layout-prebuilt'

import Yoga from 'yoga-layout-prebuilt'
import { isReactElement, isClass } from './utils'
import handler from './handler'
import FontLoader from './font'
import layoutText from './text'
import rect from './builder/rect'
import image from './builder/image'

export interface LayoutContext {
  id: number
  parentStyle: Record<string, number | string>
  inheritedStyle: Record<string, number | string>
  parent: YogaNode
  font: FontLoader
}

export default function* layout(
  element: ReactNode,
  context: LayoutContext
): Generator<undefined, string, [number, number]> {
  const { id, inheritedStyle, parent, font } = context

  // 1. Pre-process the node.
  if (element === null || typeof element === 'undefined') {
    yield
    return ''
  }

  // Not a normal element.
  if (!isReactElement(element) || typeof element.type === 'function') {
    let iter: ReturnType<typeof layout>

    if (!isReactElement(element)) {
      // Process as text node.
      iter = layoutText(String(element), context)
    } else {
      if (isClass(element.type as Function)) {
        throw new Error('Class component is not supported.')
      }
      // If it's a custom component, Satori strictly requires it to be pure,
      // stateless, and not relying on any React APIs such as hooks or suspense.
      // So we can safely evaluate it to render. Otherwise, an error will be
      // thrown by React.
      iter = layout((element.type as Function)(element.props), context)
    }

    iter.next()
    const offset = yield
    return iter.next(offset).value
  }

  // Process as element.
  const { type, props } = element
  const { style, children } = props

  const node = Yoga.Node.create()
  parent.insertChild(node, parent.getChildCount())

  const [computedStyle, newInheritableStyle] = handler(
    node,
    type,
    inheritedStyle,
    style,
    props
  )

  // 2. Do layout recursively for its children.
  const normalizedChildren =
    typeof children === 'undefined' ? [] : [].concat(children)
  const iterators: Generator<undefined, string, [number, number]>[] = []

  let i = 0
  for (const child of normalizedChildren) {
    const iter = layout(child, {
      id: id * normalizedChildren.length + ++i,
      parentStyle: computedStyle,
      inheritedStyle: newInheritableStyle,
      parent: node,
      font,
    })
    iter.next()
    iterators.push(iter)
  }

  // 3. Post-process the node.
  const [x, y] = yield

  if (style.position === 'absolute') {
    node.calculateLayout()
  }

  let { left, top, width, height } = node.getComputedLayout()

  // Attach offset to the current node.
  left += x
  top += y

  let result = ''
  for (const iter of iterators) {
    result += iter.next([left, top]).value
  }

  if (type === 'img') {
    result =
      image({ id, left, top, width, height, src: props.src }, computedStyle) +
      result
  } else {
    result = rect({ id, left, top, width, height }, computedStyle) + result
  }

  return result
}
