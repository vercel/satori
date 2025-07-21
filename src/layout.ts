/**
 * This module is used to calculate the layout of the current sub-tree.
 */

import type { ReactNode } from 'react'
import {
  isReactElement,
  isClass,
  buildXMLString,
  normalizeChildren,
  hasDangerouslySetInnerHTMLProp,
  getYoga,
  YogaNode,
} from './utils.js'
import { SVGNodeToImage } from './handler/preprocess.js'
import computeStyle from './handler/compute.js'
import FontLoader from './font.js'
import buildTextNodes from './text/index.js'
import rect from './builder/rect.js'
import { Locale, normalizeLocale } from './language.js'
import { SerializedStyle } from './handler/expand.js'

export interface LayoutContext {
  id: string
  parentStyle: SerializedStyle
  inheritedStyle: SerializedStyle
  isInheritingTransform?: boolean
  parent: YogaNode
  font: FontLoader
  embedFont: boolean
  debug?: boolean
  graphemeImages?: Record<string, string>
  canLoadAdditionalAssets: boolean
  locale?: Locale
  getTwStyles: (tw: string, style: any) => any
  onNodeDetected?: (node: SatoriNode) => void
}

export interface SatoriNode {
  // Layout information.
  left: number
  top: number
  width: number
  height: number
  type: string
  key?: string | number
  props: Record<string, any>
  textContent?: string
}

export default async function* layout(
  element: ReactNode,
  context: LayoutContext
): AsyncGenerator<
  { word: string; locale?: string }[],
  string,
  [number, number]
> {
  const Yoga = await getYoga()
  const {
    id,
    inheritedStyle,
    parent,
    font,
    debug,
    locale,
    embedFont = true,
    graphemeImages,
    canLoadAdditionalAssets,
    getTwStyles,
  } = context

  // 1. Pre-process the node.
  if (element === null || typeof element === 'undefined') {
    yield
    yield
    return ''
  }

  // Not a regular element.
  if (!isReactElement(element) || typeof element.type === 'function') {
    let iter: ReturnType<typeof layout>

    if (!isReactElement(element)) {
      // Process as text node.
      iter = buildTextNodes(String(element), context)
      yield (await iter.next()).value as { word: string; locale?: Locale }[]
    } else {
      if (isClass(element.type as Function)) {
        throw new Error('Class component is not supported.')
      }
      // If it's a custom component, Satori strictly requires it to be pure,
      // stateless, and not relying on any React APIs such as hooks or suspense.
      // So we can safely evaluate it to render. Otherwise, an error will be
      // thrown by React.
      iter = layout(await (element.type as Function)(element.props), context)
      yield (await iter.next()).value as { word: string; locale?: string }[]
    }

    await iter.next()
    const offset = yield
    return (await iter.next(offset)).value as string
  }

  // Process as element.
  const { type, props } = element
  if (props && hasDangerouslySetInnerHTMLProp(props)) {
    throw new Error(
      'dangerouslySetInnerHTML property is not supported. See documentation for more information https://github.com/vercel/satori#jsx.'
    )
  }
  let { style, children, tw, lang: _newLocale = locale } = props || {}
  const newLocale = normalizeLocale(_newLocale)

  // Extend Tailwind styles.
  if (tw) {
    const twStyles = getTwStyles(tw, style)
    style = Object.assign(twStyles, style)
  }

  const node = Yoga.Node.create()
  parent.insertChild(node, parent.getChildCount())

  const [computedStyle, newInheritableStyle] = await computeStyle(
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

  // If the element has `overflow` set to `hidden` or clip-path is set, we need to create a clip
  // path and use it in all its children.
  if (
    computedStyle.overflow === 'hidden' ||
    (computedStyle.clipPath && computedStyle.clipPath !== 'none')
  ) {
    newInheritableStyle._inheritedClipPathId = `satori_cp-${id}`
    newInheritableStyle._inheritedMaskId = `satori_om-${id}`
  }

  if (computedStyle.maskImage) {
    newInheritableStyle._inheritedMaskId = `satori_mi-${id}`
  }

  // If the element has `background-clip: text` set, we need to create a clip
  // path and use it in all its children.
  if (computedStyle.backgroundClip === 'text') {
    const mutateRefValue = { value: '' } as any
    newInheritableStyle._inheritedBackgroundClipTextPath = mutateRefValue
    computedStyle._inheritedBackgroundClipTextPath = mutateRefValue
  }

  // 2. Do layout recursively for its children.
  const normalizedChildren = normalizeChildren(children)
  const iterators: ReturnType<typeof layout>[] = []

  let i = 0
  const segmentsMissingFont: { word: string; locale?: string }[] = []
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
      locale: newLocale,
      getTwStyles,
      onNodeDetected: context.onNodeDetected,
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

  // Emit event for the current node. We don't pass the children prop to the
  // event handler because everything is already flattened, unless it's a text
  // node.
  const { children: childrenNode, ...restProps } = props
  context.onNodeDetected?.({
    left,
    top,
    width,
    height,
    type,
    props: restProps,
    key: element.key,
    textContent: isReactElement(childrenNode) ? undefined : childrenNode,
  })

  // Generate the rendered markup for the current node.
  if (type === 'img') {
    const src = computedStyle.__src as string
    baseRenderResult = await rect(
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
      computedStyle,
      newInheritableStyle
    )
  } else if (type === 'svg') {
    // When entering a <svg> node, we need to convert it to a <img> with the
    // SVG data URL embedded.
    const currentColor = computedStyle.color
    const src = await SVGNodeToImage(element, currentColor)
    baseRenderResult = await rect(
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
      computedStyle,
      newInheritableStyle
    )
  } else {
    const display = style?.display
    if (
      type === 'div' &&
      children &&
      typeof children !== 'string' &&
      display !== 'flex' &&
      display !== 'none' &&
      display !== 'contents'
    ) {
      throw new Error(
        `Expected <div> to have explicit "display: flex", "display: contents", or "display: none" if it has more than one child node.`
      )
    }
    baseRenderResult = await rect(
      { id, left, top, width, height, isInheritingTransform, debug },
      computedStyle,
      newInheritableStyle
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
