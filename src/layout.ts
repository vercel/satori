/**
 * This module is used to calculate the layout of the current sub-tree.
 */

import type { ReactNode } from 'react'
import type { YogaNode } from 'yoga-layout'

import getYoga from './yoga'
import {
  isReactElement,
  isClass,
  buildXMLString,
  SVGNodeToImage,
} from './utils'
import handler from './handler'
import FontLoader from './font'
import layoutText from './text'
import rect from './builder/rect'
import image from './builder/image'
import { resolveImageData } from './handler/image'

export interface LayoutContext {
  id: string
  parentStyle: Record<string, number | string>
  inheritedStyle: Record<string, number | string>
  isInheritingTransform?: boolean
  parent: YogaNode
  font: FontLoader
  embedFont: boolean
  debug?: boolean
  graphemeImages?: Record<string, string>
  canLoadAdditionalAssets: boolean
}

export default async function* layout(
  element: ReactNode,
  context: LayoutContext
): AsyncGenerator<string[], string, [number, number]> {
  const Yoga = getYoga()
  const {
    id,
    inheritedStyle,
    parent,
    font,
    debug,
    embedFont = true,
    graphemeImages,
    canLoadAdditionalAssets,
  } = context

  // 1. Pre-process the node.
  if (element === null || typeof element === 'undefined') {
    yield
    yield
    return ''
  }

  // Not a normal element.
  if (!isReactElement(element) || typeof element.type === 'function') {
    let iter: ReturnType<typeof layout>

    if (!isReactElement(element)) {
      // Process as text node.
      iter = layoutText(String(element), context)
      yield (await iter.next()).value as string[]
    } else {
      if (isClass(element.type as Function)) {
        throw new Error('Class component is not supported.')
      }
      // If it's a custom component, Satori strictly requires it to be pure,
      // stateless, and not relying on any React APIs such as hooks or suspense.
      // So we can safely evaluate it to render. Otherwise, an error will be
      // thrown by React.
      iter = layout((element.type as Function)(element.props), context)
      yield (await iter.next()).value as string[]
    }

    await iter.next()
    const offset = yield
    return (await iter.next(offset)).value as string
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

  // Post-process styles to attach inheritable properties for Satori.

  // If the element is inheriting the parent `transform`, or applying its own.
  // This affects the coordinate system.
  const isInheritingTransform =
    computedStyle.transform === inheritedStyle.transform
  if (!isInheritingTransform) {
    ;(computedStyle.transform as any).__parent = inheritedStyle.transform
  }

  // If the element has `overflow` set to `hidden`, we need to create a clip
  // path and use it in all its children.
  if (computedStyle.overflow === 'hidden') {
    newInheritableStyle._inheritedClipPathId = `satori_cp-${id}`
  }

  // If the element has `background-clip: text` set, we need to create a clip
  // path and use it in all its children.
  if (computedStyle.backgroundClip === 'text') {
    const mutateRefValue = { value: '' } as any
    newInheritableStyle._inheritedBackgroundClipTextPath = mutateRefValue
    computedStyle._inheritedBackgroundClipTextPath = mutateRefValue
  }

  // 2. Do layout recursively for its children.
  const normalizedChildren =
    typeof children === 'undefined' ? [] : [].concat(children)
  const iterators: ReturnType<typeof layout>[] = []

  let i = 0
  const segmentsMissingFont: string[] = []
  for (const child of normalizedChildren) {
    const iter = layout(child, {
      id: id + '-' + i++,
      parentStyle: computedStyle,
      inheritedStyle: newInheritableStyle,
      isInheritingTransform: true,
      parent: node,
      font,
      embedFont,
      debug,
      graphemeImages,
      canLoadAdditionalAssets,
    })
    if (canLoadAdditionalAssets) {
      segmentsMissingFont.push(...(((await iter.next()).value as any) || []))
    } else {
      await iter.next()
    }
    iterators.push(iter)
  }
  yield segmentsMissingFont
  for (const iter of iterators) await iter.next()

  // 3. Post-process the node.
  const [x, y] = yield

  let { left, top, width, height } = node.getComputedLayout()

  // Attach offset to the current node.
  left += x
  top += y

  let childrenRenderResult = ''
  let baseRenderResult = ''
  let depsRenderResult = ''

  // Generate the rendered markup for the current node.
  if (type === 'img') {
    const src = await resolveImageData(props.src)
    baseRenderResult = image(
      {
        id,
        left,
        top,
        width,
        height,
        src,
        isInheritingTransform,
        debug,
      },
      computedStyle
    )
  } else if (type === 'svg') {
    // When entering a <svg> node, we need to convert it to a <img> with the
    // SVG data URL embedded.
    const src = SVGNodeToImage(element)
    baseRenderResult = image(
      {
        id,
        left,
        top,
        width,
        height,
        src,
        isInheritingTransform,
        debug,
      },
      computedStyle
    )
  } else {
    const display = style?.display ?? 'block'
    if (
      type === 'div' &&
      children &&
      typeof children !== 'string' &&
      display !== 'flex' &&
      display !== 'none'
    ) {
      throw new Error(
        `Expected <div> to have style={{display: 'flex'}} but received style={{display: '${display}'}}`
      )
    }
    baseRenderResult = await rect(
      { id, left, top, width, height, isInheritingTransform, debug },
      computedStyle
    )
  }

  // Generate the rendered markup for the children.
  for (const iter of iterators) {
    childrenRenderResult += (await iter.next([left, top])).value
  }

  // An extra pass to generate the special background-clip shape collected from
  // children.
  if (computedStyle._inheritedBackgroundClipTextPath) {
    depsRenderResult += buildXMLString(
      'clipPath',
      {
        id: `satori_bct-${id}`,
        'clip-path': computedStyle._inheritedClipPathId
          ? `url(#${computedStyle._inheritedClipPathId})`
          : undefined,
      },
      (computedStyle._inheritedBackgroundClipTextPath as any).value
    )
  }

  return depsRenderResult + baseRenderResult + childrenRenderResult
}
