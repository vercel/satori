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
  isReactComponent,
  isForwardRefComponent,
} from './utils.js'
import { getYoga, YogaNode } from './yoga.js'
import { SVGNodeToImage } from './handler/preprocess.js'
import computeStyle from './handler/compute.js'
import FontLoader from './font.js'
import buildTextNodes from './text/index.js'
import rect from './builder/rect.js'
import { Locale, normalizeLocale } from './language.js'
import { SerializedStyle } from './handler/expand.js'
import type { ReplacedElementHandlers } from './handler/compute.js'
import type { ParsedTransformOrigin } from './transform-origin.js'
import type { TransformFunction } from './parser/transform.js'
import {
  getDepth,
  isBackFacing,
  resolveTransformState,
  ROOT_TRANSFORM_STATE,
  type ProjectPlane,
  type TransformState,
} from './builder/transform.js'

/** An element drawn in a 3D rendering context, sorted by depth. */
interface Plane {
  depth: number
  svg: string
}

type TransformList = TransformFunction[] & {
  __parent?: TransformList
  __state?: TransformState
}

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
  replacedElements?: ReplacedElementHandlers
  /** Draws elements with perspective, see `satori/experimental`. */
  projectPlane?: ProjectPlane
  /** Collects the planes of the 3D rendering context the element is in. */
  planes?: Plane[]
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
  if (!isReactElement(element) || isReactComponent(element.type)) {
    let iter: ReturnType<typeof layout>

    if (!isReactElement(element)) {
      // Process as text node.
      iter = buildTextNodes(String(element), context)
      yield (await iter.next()).value as { word: string; locale?: Locale }[]
    } else {
      if (isClass(element.type as Function)) {
        throw new Error('Class component is not supported.')
      }

      let render: Function

      // This is a hack to support React.forwardRef wrapped components.
      // https://github.com/vercel/satori/issues/600
      if (isForwardRefComponent(element.type)) {
        render = (element.type as any).render
      } else {
        render = element.type as Function
      }

      // If it's a custom component, Satori strictly requires it to be pure,
      // stateless, and not relying on any React APIs such as hooks or suspense.
      // So we can safely evaluate it to render. Otherwise, an error will be
      // thrown by React.
      iter = layout(await render(element.props), context)
      yield (await iter.next()).value as { word: string; locale?: string }[]
    }

    await iter.next()
    const offset = yield
    return (await iter.next(offset)).value as string
  }

  // Process as element.
  const { type: $type, props } = element
  // type must be a string here.
  const type = $type as string

  if (props && hasDangerouslySetInnerHTMLProp(props)) {
    throw new Error(
      'dangerouslySetInnerHTML property is not supported. See documentation for more information https://github.com/vercel/satori#jsx.'
    )
  }
  let { style, children, tw, lang: _newLocale = locale } = props || {}
  const newLocale = normalizeLocale(_newLocale)

  if (style && typeof style === 'object') {
    style = Object.fromEntries(
      Object.entries(style).filter(([, value]) => value != null)
    )
  }

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
    props,
    context.replacedElements
  )
  // Post-process styles to attach inheritable properties for Satori.

  // Elements that affect how their children are transformed, and children of
  // those, need their own transform state even without a `transform`.
  const preserve3d = computedStyle.transformStyle === 'preserve-3d'
  const perspective =
    typeof computedStyle.perspective === 'number'
      ? computedStyle.perspective
      : undefined
  if (
    computedStyle.transform === inheritedStyle.transform &&
    (preserve3d ||
      perspective !== undefined ||
      context.parentStyle.transformStyle === 'preserve-3d' ||
      typeof context.parentStyle.perspective === 'number')
  ) {
    computedStyle.transform = [] as any
    newInheritableStyle.transform = computedStyle.transform
  }

  // If the element is inheriting the parent `transform`, or applying its own.
  // This affects the coordinate system.
  const isInheritingTransform =
    computedStyle.transform === inheritedStyle.transform
  if (!isInheritingTransform) {
    ;(computedStyle.transform as unknown as TransformList).__parent =
      inheritedStyle.transform as unknown as TransformList
  }

  // A `preserve-3d` element establishes a 3D rendering context, or extends
  // the one it's in. Its children are drawn sorted by depth.
  const planes = preserve3d ? context.planes || [] : undefined

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

    if (computedStyle.backgroundImage) {
      newInheritableStyle._inheritedBackgroundClipTextHasBackground = 'true'
      computedStyle._inheritedBackgroundClipTextHasBackground = 'true'
    }
  }

  // 2. Do layout recursively for its children.
  // Children of replaced elements, e.g. the fallback content of a <canvas>,
  // are never rendered.
  const isReplaced = !!context.replacedElements?.[type]
  const normalizedChildren = isReplaced ? [] : normalizeChildren(children)
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
      replacedElements: context.replacedElements,
      projectPlane: context.projectPlane,
      planes,
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

  // Resolve transforms now that the layout is known. Children read the state
  // from their parent's transform list.
  const transformList = computedStyle.transform as unknown as
    | TransformList
    | undefined
  if (transformList && !isInheritingTransform) {
    transformList.__state = resolveTransformState({
      functions: transformList,
      box: { left, top, width, height },
      origin: computedStyle.transformOrigin as ParsedTransformOrigin,
      parent: transformList.__parent?.__state || ROOT_TRANSFORM_STATE,
      preserve3d,
      perspectiveDistance: perspective,
      perspectiveOrigin:
        computedStyle.perspectiveOrigin as unknown as ParsedTransformOrigin,
      canProject: !!context.projectPlane,
    })
  }
  const transformState = transformList?.__state || ROOT_TRANSFORM_STATE
  const isHidden =
    transformState.behindViewer ||
    (computedStyle.backfaceVisibility === 'hidden' &&
      isBackFacing(transformState))

  // Planes of a 3D rendering context are drawn back to front. Equal depths
  // keep the document order, so an element is added before its children.
  let plane: Plane | undefined
  const contextPlanes = context.planes || planes
  if (contextPlanes) {
    const depth = getDepth(transformState, left + width / 2, top + height / 2)
    // Round off floating point errors, so planes at the same depth are equal.
    plane = {
      depth: Number.isFinite(depth) ? Math.round(depth * 1e6) / 1e6 : 0,
      svg: '',
    }
    contextPlanes.push(plane)
  }

  // Generate the rendered markup for the current node.
  if (type === 'img' || isReplaced) {
    // A replaced element without rendered content has no `src`, so it's drawn
    // as a box.
    const src = computedStyle.__src as string | undefined
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

  // Children in the same 3D rendering context were added to `planes` and
  // returned nothing, so this is the element's own plane, including the
  // descendants flattened onto it.
  let result = isHidden
    ? ''
    : depsRenderResult + baseRenderResult + childrenRenderResult

  if (result && transformState.projection && !isInheritingTransform) {
    result = context.projectPlane(result, {
      matrix: transformState.projection,
      node,
      left,
      top,
      style: computedStyle,
      id,
    })
  }

  if (plane) {
    plane.svg = result
    // The element establishing the 3D rendering context draws all of them.
    if (context.planes) return ''
    return planes
      .sort((a, b) => a.depth - b.depth)
      .map(({ svg }) => svg)
      .join('')
  }

  return result
}
