/**
 * This module is used to calculate the layout of the current sub-tree.
 */

import type { ReactElement, ReactNode } from 'react'
import {
  isReactElement,
  isClass,
  buildXMLString,
  normalizeChildren,
  hasDangerouslySetInnerHTMLProp,
  isReactComponent,
  isForwardRefComponent,
} from './utils.js'
import { LayoutNode } from './layout-engine/index.js'
import { SVGNodeToImage } from './handler/preprocess.js'
import { svgTransformToCSS } from './parser/svg-transform.js'
import computeStyle from './handler/compute.js'
import FontLoader from './font.js'
import buildTextNodes from './text/index.js'
import {
  buildInlineText,
  InlineFormatting,
  type AtomicInline,
  type InlineBox,
  type InlineEnv,
} from './text/inline.js'
import rect from './builder/rect.js'
import outline from './builder/outline.js'
import {
  buildFilterPrimitive,
  getExpansion,
} from './builder/backdrop-filter.js'
import type { BackdropFilter } from './parser/backdrop-filter.js'
import { Locale, normalizeLocale } from './language.js'
import { SerializedStyle } from './handler/expand.js'
import type {
  OuterDisplay,
  ReplacedElementHandlers,
} from './handler/compute.js'
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
import {
  getFixedElementPosition,
  insertFixedNode,
  type FixedContainingBlock,
  type FixedElement,
} from './fixed-position.js'

/** An element drawn in a 3D rendering context, sorted by depth. */
interface Plane {
  depth: number
  svg: string
}

/**
 * Positioned elements and stacking contexts are painted by the stacking
 * context they're in, ordered by `z-index`:
 * https://www.w3.org/TR/CSS22/zindex.html
 */
interface StackingLayer {
  zIndex: number
  svg: string
}

interface StackingContext {
  layers: StackingLayer[]
  /**
   * Whether an element in it has `mix-blend-mode`. They blend with the content
   * of the stacking context only, so it's drawn as an isolated group.
   */
  hasBlending?: boolean
}

/**
 * Paint a stacking context's layers around its in-flow content. Layers are
 * added in tree order, which the sort keeps for equal `z-index` values.
 */
function paintStackingContext(layers: StackingLayer[], content: string) {
  layers.sort((a, b) => a.zIndex - b.zIndex)
  let svg = ''
  let i = 0
  for (; i < layers.length && layers[i].zIndex < 0; i++) svg += layers[i].svg
  svg += content
  for (; i < layers.length; i++) svg += layers[i].svg
  return svg
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
  parent: LayoutNode
  font: FontLoader
  embedFont: boolean
  debug?: boolean
  graphemeImages?: Record<string, string>
  canLoadAdditionalAssets: boolean
  locale?: Locale
  getTwStyles: (tw: string, style: any) => any
  onNodeDetected?: (node: SatoriNode) => void
  onStyleError?: (error: Error) => void
  replacedElements?: ReplacedElementHandlers
  /** Draws elements with perspective, see `satori/experimental`. */
  projectPlane?: ProjectPlane
  /** Collects the planes of the 3D rendering context the element is in. */
  planes?: Plane[]
  /**
   * The containing block of `position: fixed` descendants, if they're
   * displayed.
   */
  fixedContainingBlock?: FixedContainingBlock
  /** Collects the fixed elements laid out in their containing block. */
  fixedElements: FixedElement[]
  /**
   * Collects the layers of the stacking context the element is in. The root
   * element has none, and establishes the root stacking context.
   */
  stackingContext?: StackingContext
  /**
   * How the parent lays out its children. Elements are blockified unless
   * they're in a block container.
   */
  formattingContext?: 'block' | 'flex' | 'grid' | 'root'
  /** The inline content of the block container the element is in. */
  inline?: InlineFormatting
  /** Lays out a tree on its own, for atomic inlines. */
  computeLayout?: InlineEnv['computeLayout']
  /** The node of a paragraph to lay out text in, see `buildInlineText()`. */
  textNode?: LayoutNode
  /** Whether the text fills the width of a block container. */
  blockParagraph?: boolean
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
      // Process as text node. In a block container, it's inline content.
      iter = context.inline
        ? buildInlineText(String(element), context)
        : buildTextNodes(String(element), context)
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

  // A fragment, e.g. returned by a component, generates no box.
  if ((element.type as unknown) === Symbol.for('react.fragment')) {
    return yield* layout(
      {
        ...element,
        type: 'div',
        props: {
          children: element.props?.children,
          style: { display: 'contents' },
        },
      } as ReactElement,
      context
    )
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
  // A line break in inline content.
  if (type === 'br') {
    context.inline?.addBreak()
    yield []
    yield
    return ''
  }

  let { style, children, tw, lang: _newLocale = locale } = props || {}
  const newLocale = normalizeLocale(_newLocale)

  // Extend Tailwind styles.
  if (tw) {
    const twStyles = getTwStyles(tw, style)
    style = Object.assign(twStyles, style)
  }

  // The `transform` attribute of an inline SVG transforms its box, unless the
  // `transform` property is set.
  if (
    type === 'svg' &&
    typeof props.transform === 'string' &&
    style?.transform === undefined
  ) {
    const transform = svgTransformToCSS(props.transform)
    if (transform) style = { ...style, transform }
  }

  const node = new LayoutNode()

  const [computedStyle, newInheritableStyle] = await computeStyle(
    node,
    type,
    inheritedStyle,
    style,
    props,
    context.replacedElements,
    context.onStyleError
  )

  // Elements are blockified in flex and grid containers, as the root
  // element, and when they're out of flow. Inline elements without a box are
  // laid out by the paragraphs of their block container, and atomic inlines
  // on their own.
  const isOutOfFlow =
    computedStyle.position === 'absolute' || computedStyle.position === 'fixed'
  let outerDisplay = computedStyle.__outerDisplay as OuterDisplay
  if (
    outerDisplay === 'inline' &&
    (context.formattingContext !== 'block' || isOutOfFlow || !context.inline)
  ) {
    outerDisplay = 'block'
  }
  const isReplacedElement =
    type === 'img' || type === 'svg' || !!context.replacedElements?.[type]
  const isInlineBox =
    outerDisplay === 'inline' &&
    computedStyle.__innerDisplay === 'inline' &&
    !isReplacedElement
  const atomicInline: AtomicInline | undefined =
    outerDisplay === 'inline' && !isInlineBox
      ? { node, style: computedStyle }
      : undefined
  const isContents = outerDisplay === 'contents' && !!context.inline
  let inlineBox: InlineBox | undefined
  if (isInlineBox) {
    // `transform` and `overflow` don't apply to inline boxes.
    computedStyle.transform = inheritedStyle.transform
    newInheritableStyle.transform = inheritedStyle.transform
    computedStyle.overflow = 'visible'
    computedStyle.clipPath = undefined
    inlineBox = { style: computedStyle, fragments: [], paragraphs: [] }
  }

  // A fixed element is laid out in its containing block. Without a box, it's
  // not positioned.
  const fixedElement =
    computedStyle.position === 'fixed' &&
    node.style.display !== 'none' &&
    node.style.display !== 'contents'
      ? insertFixedNode(
          node,
          parent,
          context.fixedContainingBlock,
          context.fixedElements
        )
      : undefined
  if (fixedElement) {
    // `overflow: hidden` of elements between it and its containing block
    // doesn't clip it.
    const { clipPathId, maskId } = fixedElement.containingBlock
    for (const s of [computedStyle, newInheritableStyle]) {
      s._inheritedClipPathId = clipPathId
      s._inheritedMaskId = maskId
    }
  } else if (inlineBox) {
    context.inline.openBox(inlineBox)
  } else if (atomicInline) {
    context.inline.addAtomic(atomicInline)
  } else if (!isContents) {
    // A block-level box ends the paragraph before it.
    if (outerDisplay === 'block' && !isOutOfFlow) {
      context.inline?.breakForBlock()
    }
    parent.insertChild(node)
  }

  // Post-process styles to attach inheritable properties for Satori.

  const opacity =
    typeof computedStyle.opacity === 'number' ? computedStyle.opacity : 1

  // Elements that affect how their children are transformed, and children of
  // those, need their own transform state even without a `transform`. Like in
  // browsers, `opacity` makes `preserve-3d` flat, as the element and its
  // descendants are drawn as a group.
  const preserve3d =
    computedStyle.transformStyle === 'preserve-3d' && opacity === 1
  const perspective =
    typeof computedStyle.perspective === 'number'
      ? computedStyle.perspective
      : undefined

  // These properties make the element the containing block of its fixed
  // descendants.
  const isFixedContainingBlock =
    computedStyle.transformStyle === 'preserve-3d' ||
    perspective !== undefined ||
    (computedStyle.transform !== inheritedStyle.transform &&
      (computedStyle.transform as unknown as TransformList).length > 0) ||
    (!!computedStyle.filter &&
      computedStyle.filter !== 'none' &&
      computedStyle.filter !== inheritedStyle.filter) ||
    (computedStyle._backdropFilters as unknown as unknown[] | undefined)
      ?.length > 0

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
  const hasClipPath =
    computedStyle.clipPath && computedStyle.clipPath !== 'none'
  if (computedStyle.overflow === 'hidden' || hasClipPath) {
    newInheritableStyle._inheritedClipPathId = `satori_cp-${id}`
    newInheritableStyle._inheritedMaskId = `satori_om-${id}`
  }

  if (computedStyle.maskImage) {
    newInheritableStyle._inheritedMaskId = `satori_mi-${id}`
  }

  // Fixed descendants are clipped by their containing block, and by the
  // `clip-path` and `mask-image` of elements in between. Descendants of an
  // element that isn't displayed aren't displayed either.
  let fixedContainingBlock = context.fixedContainingBlock
  const fixedClip = {
    clipPathId: newInheritableStyle._inheritedClipPathId as string | undefined,
    maskId: newInheritableStyle._inheritedMaskId as string | undefined,
  }
  if (node.style.display === 'none') {
    fixedContainingBlock = undefined
  } else if (isFixedContainingBlock) {
    fixedContainingBlock = { node, offset: { left: 0, top: 0 }, ...fixedClip }
  } else if (fixedContainingBlock && (hasClipPath || computedStyle.maskImage)) {
    fixedContainingBlock = { ...fixedContainingBlock, ...fixedClip }
  }

  // A stacking context paints its descendants together. Elements of a 3D
  // rendering context, elements projected by the `perspective` of their parent,
  // and elements hidden by `backface-visibility` are drawn with their
  // descendants too. All elements are flex items, so `z-index` applies even to
  // static ones.
  const zIndex =
    typeof computedStyle.zIndex === 'number' ? computedStyle.zIndex : undefined
  const isPositioned = computedStyle.position !== 'static'
  const mixBlendMode =
    computedStyle.mixBlendMode && computedStyle.mixBlendMode !== 'normal'
      ? computedStyle.mixBlendMode
      : undefined
  const isStackingContext =
    !context.stackingContext ||
    !!mixBlendMode ||
    computedStyle.isolation === 'isolate' ||
    zIndex !== undefined ||
    computedStyle.position === 'fixed' ||
    isFixedContainingBlock ||
    opacity < 1 ||
    !!hasClipPath ||
    !!computedStyle.maskImage ||
    !!context.planes ||
    typeof context.parentStyle.perspective === 'number' ||
    computedStyle.backfaceVisibility === 'hidden'
  const stackingContext: StackingContext = isStackingContext
    ? { layers: [] }
    : context.stackingContext
  if (mixBlendMode && context.stackingContext) {
    context.stackingContext.hasBlending = true
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
  // The content of SVG elements is drawn as an image.
  const isReplaced = !!context.replacedElements?.[type]
  const normalizedChildren =
    isReplaced || type === 'svg' ? [] : normalizeChildren(children)
  const iterators: ReturnType<typeof layout>[] = []

  // Children of a block container take part in its inline content, and
  // children of inline boxes in the one of their block container.
  const isBlockContainer =
    !inlineBox &&
    !isContents &&
    !isReplacedElement &&
    (node.style.display === 'block' || node.style.display === 'flow-root')
  const childInline = isBlockContainer
    ? new InlineFormatting(node, computedStyle, {
        font,
        embedFont,
        debug,
        graphemeImages,
        computeLayout: context.computeLayout,
      })
    : inlineBox || isContents
    ? context.inline
    : undefined
  const childFormattingContext: LayoutContext['formattingContext'] =
    isBlockContainer
      ? 'block'
      : inlineBox || outerDisplay === 'contents'
      ? context.formattingContext
      : node.style.display === 'grid'
      ? 'grid'
      : 'flex'
  const childParent = inlineBox || isContents ? context.inline.container : node

  let i = 0
  const segmentsMissingFont: { word: string; locale?: string }[] = []
  // The `order` of the flex or grid item each child generates.
  const childOrders: number[] = []
  for (const child of normalizedChildren) {
    const childCount = childParent.children.length
    const iter = layout(child, {
      id: id + '-' + i++,
      parentStyle: computedStyle,
      inheritedStyle: newInheritableStyle,
      isInheritingTransform: true,
      parent: childParent,
      font,
      embedFont,
      debug,
      graphemeImages,
      canLoadAdditionalAssets,
      locale: newLocale,
      getTwStyles,
      onNodeDetected: context.onNodeDetected,
      onStyleError: context.onStyleError,
      replacedElements: context.replacedElements,
      projectPlane: context.projectPlane,
      planes,
      fixedContainingBlock,
      fixedElements: context.fixedElements,
      stackingContext,
      formattingContext: childFormattingContext,
      inline: childInline,
      computeLayout: context.computeLayout,
    })
    if (canLoadAdditionalAssets) {
      segmentsMissingFont.push(...(((await iter.next()).value as any) || []))
    } else {
      await iter.next()
    }
    const added = childParent.children.slice(childCount)
    childOrders.push(added.length === 1 ? added[0].style.order || 0 : 0)
    iterators.push(iter)
  }
  if (inlineBox) context.inline.closeBox(inlineBox)
  yield segmentsMissingFont
  for (const iter of iterators) await iter.next()

  // 3. Post-process the node.
  const [x, y] = yield
  // Atomic inlines are positioned by their paragraph.
  atomicInline?.paragraph?.finalize()
  let { left, top, width, height } = node.layout
  if (fixedElement) {
    ;[left, top] = getFixedElementPosition(fixedElement, x, y)
  } else {
    // Attach offset to the current node.
    left += x
    top += y
  }
  if (fixedContainingBlock?.node === node) {
    fixedContainingBlock.offset.left = left
    fixedContainingBlock.offset.top = top
  }

  // Add the layer before the descendants add theirs, to keep the tree order.
  // Elements of a 3D rendering context are drawn by depth instead.
  let layer: StackingLayer | undefined
  if (
    context.stackingContext &&
    !context.planes &&
    (isPositioned || isStackingContext)
  ) {
    layer = { zIndex: zIndex ?? 0, svg: '' }
    context.stackingContext.layers.push(layer)
  }

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

  // An element is drawn as a group with its opacity, with its descendants
  // and the elements in its stacking context. Without
  // children, it's drawn by itself, which avoids an extra group for a single
  // shape.
  let groupOpacity = opacity < 1 && iterators.length > 0 ? opacity : 1
  const rectOpacity = groupOpacity < 1 ? 1 : opacity
  const drawn = { shapes: true }

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
        opacity: rectOpacity,
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
        opacity: rectOpacity,
      },
      computedStyle,
      newInheritableStyle
    )
  } else if (inlineBox) {
    // Each line has a fragment of the box. The edges are only drawn where the
    // box starts and ends.
    for (const paragraph of inlineBox.paragraphs) paragraph.finalize()
    drawn.shapes = false
    for (const [index, fragment] of inlineBox.fragments.entries()) {
      const fragmentStyle = { ...computedStyle }
      if (!fragment.first) {
        fragmentStyle.borderLeftWidth = 0
        fragmentStyle.paddingLeft = 0
        fragmentStyle.borderTopLeftRadius = 0
        fragmentStyle.borderBottomLeftRadius = 0
      }
      if (!fragment.last) {
        fragmentStyle.borderRightWidth = 0
        fragmentStyle.paddingRight = 0
        fragmentStyle.borderTopRightRadius = 0
        fragmentStyle.borderBottomRightRadius = 0
      }
      const fragmentDrawn = { shapes: true }
      baseRenderResult += await rect(
        {
          id: `${id}-${index}`,
          left: left + fragment.paragraph.node.layout.left + fragment.left,
          top: top + fragment.paragraph.node.layout.top + fragment.top,
          width: fragment.width,
          height: fragment.height,
          isInheritingTransform,
          debug,
          opacity: rectOpacity,
          drawn: fragmentDrawn,
        },
        fragmentStyle,
        newInheritableStyle
      )
      drawn.shapes ||= fragmentDrawn.shapes
    }
  } else {
    baseRenderResult = await rect(
      {
        id,
        left,
        top,
        width,
        height,
        isInheritingTransform,
        debug,
        opacity: rectOpacity,
        drawn,
      },
      computedStyle,
      newInheritableStyle
    )
  }

  // If the element only has text, the text is drawn with the opacity, which
  // can avoid a group for a single path.
  if (
    groupOpacity < 1 &&
    !drawn.shapes &&
    normalizedChildren.length === 1 &&
    typeof normalizedChildren[0] === 'string'
  ) {
    computedStyle._textOpacity = groupOpacity
    groupOpacity = 1
  }

  // Generate the rendered markup for the children. Flex and grid items are
  // painted in `order`, like they're laid out.
  const paintOrder = iterators.map((_, index) => index)
  if (
    childParent === node &&
    (node.style.display === 'flex' || node.style.display === 'grid') &&
    childOrders.some(Boolean)
  ) {
    paintOrder.sort((a, b) => childOrders[a] - childOrders[b])
  }
  for (const index of paintOrder) {
    childrenRenderResult += (await iterators[index].next([left, top])).value
  }

  // The outline is drawn over the element and its in-flow descendants, and
  // under positioned ones. Outlines of inline boxes aren't drawn.
  const outlineResult =
    inlineBox || computedStyle.visibility === 'hidden'
      ? ''
      : outline(
          { id, left, top, width, height, isInheritingTransform },
          computedStyle
        )

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
  // An element without a box draws nothing, including its descendants.
  let result =
    isHidden || opacity === 0 || node.style.display === 'none'
      ? ''
      : depsRenderResult +
        baseRenderResult +
        (isStackingContext
          ? paintStackingContext(
              stackingContext.layers,
              childrenRenderResult + outlineResult
            )
          : childrenRenderResult + outlineResult)

  // The filter applies to the element and its descendants as a group, then
  // its own clip path clips the filtered result, e.g. the edges of a blur.
  // https://drafts.fxtf.org/filter-effects-1/#placement
  const filters = computedStyle._filters as unknown as
    | BackdropFilter[]
    | undefined
  if (result && filters?.length) {
    // Descendants can be drawn anywhere, so the filter region is the image,
    // and what the filter draws into it from outside.
    const filterId = `satori_f-${id}`
    const expansion = getExpansion(filters)
    const primitives = filters
      .map((filter, index) =>
        buildFilterPrimitive(
          filter,
          index ? `${filterId}-${index - 1}` : 'SourceGraphic',
          `${filterId}-${index}`,
          false
        )
      )
      .join('')
    result =
      buildXMLString(
        'filter',
        {
          id: filterId,
          x: -expansion.left,
          y: -expansion.top,
          width:
            (computedStyle._viewportWidth as number) +
            expansion.left +
            expansion.right,
          height:
            (computedStyle._viewportHeight as number) +
            expansion.top +
            expansion.bottom,
          filterUnits: 'userSpaceOnUse',
          'color-interpolation-filters': 'sRGB',
        },
        primitives
      ) + buildXMLString('g', { filter: `url(#${filterId})` }, result)
    if (hasClipPath && isInheritingTransform) {
      result = buildXMLString(
        'g',
        { 'clip-path': `url(#satori_cp-${id})` },
        result
      )
    }
  }

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

  // The root stacking context is isolated by the SVG itself.
  const isolate =
    isStackingContext &&
    stackingContext.hasBlending &&
    !!context.stackingContext
  if (result && (mixBlendMode || isolate || groupOpacity < 1)) {
    result = buildXMLString(
      'g',
      {
        opacity: groupOpacity < 1 ? groupOpacity : undefined,
        style:
          [
            mixBlendMode && `mix-blend-mode:${mixBlendMode}`,
            isolate && 'isolation:isolate',
          ]
            .filter(Boolean)
            .join(';') || undefined,
      },
      result
    )
  }

  if (plane) {
    plane.svg = result
    // The element establishing the 3D rendering context draws all of them.
    if (context.planes) return ''
    result = planes
      .sort((a, b) => a.depth - b.depth)
      .map(({ svg }) => svg)
      .join('')
  }

  if (layer) {
    layer.svg = result
    return ''
  }
  return result
}
