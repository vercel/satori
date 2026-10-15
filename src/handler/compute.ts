/**
 * Handler to update the layout node style with the given element type and
 * style. Each supported element has its own preset styles, so this function
 * also returns the inherited style for children of the element.
 */

import presets from './presets.js'
import inheritable, { isInherited } from './inheritable.js'
import { toPhysicalProperties } from './logical.js'
import { isLonghandOf } from './shorthands.js'
import expand, { SerializedStyle } from './expand.js'
import {
  asPointAutoPercentageLength,
  asPointPercentageLength,
  asSize,
  lengthToNumber,
  parseViewBox,
  v as checkValue,
} from '../utils.js'
import {
  LayoutNode,
  type LayoutStyle,
  type Length,
} from '../layout-engine/index.js'
import { resolveImageData } from './image.js'
import {
  parseGridAutoFlow,
  parseGridAutoTracks,
  parseGridLine,
  parseGridTemplateAreas,
  parseGridTrackList,
} from '../parser/grid.js'

type SatoriElement = keyof typeof presets

/**
 * Handles a replaced element provided by an extension, such as `<canvas>` in
 * `satori/experimental`: it sizes the node through `style`, and can set
 * `style.__src` to embed its content as an image. Its children aren't
 * rendered.
 */
export type ReplacedElementHandler = (
  node: LayoutNode,
  style: SerializedStyle,
  props: Record<string, any>
) => Promise<void>

export type ReplacedElementHandlers = Record<string, ReplacedElementHandler>

/**
 * Size a replaced element from its CSS size, falling back to its
 * `width`/`height` attributes and natural aspect ratio.
 */
export function setReplacedElementSize(
  node: LayoutNode,
  style: SerializedStyle,
  naturalWidth: number,
  naturalHeight: number,
  attributeWidth: number | string | undefined,
  attributeHeight: number | string | undefined
) {
  const r = naturalHeight / naturalWidth

  // Without one of the sizes, the content box has the natural ratio. The
  // sizes are of the border box with `box-sizing: border-box`.
  const isBorderBox = style.boxSizing === 'border-box'
  const extraHorizontal = isBorderBox
    ? (style.borderLeftWidth || 0) +
      (style.borderRightWidth || 0) +
      (style.paddingLeft || 0) +
      (style.paddingRight || 0)
    : 0
  const extraVertical = isBorderBox
    ? (style.borderTopWidth || 0) +
      (style.borderBottomWidth || 0) +
      (style.paddingTop || 0) +
      (style.paddingBottom || 0)
    : 0

  // Attributes are lengths in px.
  const toLength = (value: number | string | undefined) =>
    typeof value === 'string' && /^(?:\d+(?:\.\d+)?|\.\d+)$/.test(value.trim())
      ? Number(value)
      : value
  // Like in browsers, styles override the attributes, also with `auto`, which
  // then has the natural ratio, e.g. `height: auto` with a width attribute.
  const size = (
    value: number | string | undefined,
    attribute: number | string | undefined
  ) =>
    value === undefined
      ? toLength(attribute)
      : value === 'auto'
      ? undefined
      : value
  let width = size(style.width, attributeWidth)
  let height = size(style.height, attributeHeight)

  if (width === undefined && height === undefined) {
    width = '100%'
    node.style.aspectRatio = 1 / r
  } else if (height === undefined) {
    if (typeof width === 'number') {
      height = (width - extraHorizontal) * r + extraVertical
    } else {
      node.style.aspectRatio = 1 / r
    }
  } else if (width === undefined) {
    if (typeof height === 'number') {
      width = (height - extraVertical) / r + extraHorizontal
    } else {
      node.style.aspectRatio = 1 / r
    }
  }

  style.width = width
  style.height = height
  style.__naturalWidth = naturalWidth
  style.__naturalHeight = naturalHeight
}

// Values of `align-items`, `align-self`, `justify-items` and `justify-self`.
const ITEM_ALIGNMENT = {
  stretch: 'stretch',
  center: 'center',
  start: 'start',
  end: 'end',
  'self-start': 'start',
  'self-end': 'end',
  'flex-start': 'flex-start',
  'flex-end': 'flex-end',
  baseline: 'baseline',
} as const

export type OuterDisplay = 'block' | 'inline' | 'contents' | 'none'

/** The outer and inner display types of each value of `display`. */
const DISPLAY_TYPES: Record<
  string,
  [OuterDisplay, LayoutStyle['display'] | 'inline']
> = {
  block: ['block', 'block'],
  'flow-root': ['block', 'flow-root'],
  // With a marker, see `getListMarkers()`.
  'list-item': ['block', 'block'],
  flex: ['block', 'flex'],
  '-webkit-box': ['block', 'flex'],
  grid: ['block', 'grid'],
  inline: ['inline', 'inline'],
  'inline-block': ['inline', 'flow-root'],
  'inline-flex': ['inline', 'flex'],
  'inline-grid': ['inline', 'grid'],
  contents: ['contents', 'contents'],
  none: ['none', 'none'],
}

const LIST_ELEMENTS = new Set(['ul', 'ol', 'menu', 'dir'])
const LIST_TYPES: Record<string, string> = {
  '1': 'decimal',
  a: 'lower-alpha',
  A: 'upper-alpha',
  i: 'lower-roman',
  I: 'upper-roman',
  disc: 'disc',
  circle: 'circle',
  square: 'square',
}

/**
 * The list styles of the user agent stylesheet, and the `type`, `start`,
 * `reversed` and `value` attributes of lists. `listDepth` is the number of
 * lists the element is in.
 */
function getListPresets(
  type: string,
  props: Record<string, any>,
  listDepth: number
) {
  const preset: Record<string, string | number> = {}
  if (LIST_ELEMENTS.has(type)) {
    preset.listStyleType =
      type === 'ol'
        ? 'decimal'
        : listDepth === 0
        ? 'disc'
        : listDepth === 1
        ? 'circle'
        : 'square'
    // Nested lists have no vertical margins.
    if (listDepth > 0) preset.marginTop = preset.marginBottom = 0
    preset.counterReset = 'list-item'
  }
  if (
    (type === 'ol' || type === 'ul' || type === 'li') &&
    typeof props?.type === 'string' &&
    LIST_TYPES[props.type]
  ) {
    preset.listStyleType = LIST_TYPES[props.type]
  }
  if (type === 'ol') {
    const start = parseInt(props?.start, 10)
    const reversed = props?.reversed !== undefined && props.reversed !== false
    if (reversed) {
      preset.counterReset = Number.isNaN(start)
        ? 'reversed(list-item)'
        : `reversed(list-item) ${start + 1}`
    } else if (!Number.isNaN(start)) {
      preset.counterReset = `list-item ${start - 1}`
    }
  }
  if (type === 'li' && props?.value !== undefined) {
    const value = parseInt(props.value, 10)
    if (!Number.isNaN(value)) preset.counterSet = `list-item ${value}`
  }
  return preset
}

/**
 * The `dir` attribute sets `direction` like the user agent stylesheet, so the
 * `direction` property overrides it.
 */
/** The inherited style of the root, the initial values of these properties. */
export const ROOT_STYLE: Record<string, string | number> = {
  fontSize: 16,
  fontWeight: 'normal',
  fontFamily: 'serif',
  fontStyle: 'normal',
  lineHeight: 'normal',
  color: 'black',
  whiteSpace: 'normal',
}

const CSS_WIDE_KEYWORDS = new Set([
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
])

/**
 * Resolves the CSS-wide keywords of a style, which override earlier
 * declarations and the preset. Returns the other declarations, and the
 * properties that get their initial value: with `initial`, and `unset` and
 * `inherit` for properties that aren't inherited, as the values of the parent
 * aren't known here. Other inherited properties keep the inherited value.
 */
function resolveKeywords(
  style: Record<string, string | number>,
  preset: Record<string, string | number>
) {
  const defined: Record<string, string | number> = {}
  const initial = new Set<string>()
  for (const prop in style) {
    const value = style[prop]
    const keyword =
      typeof value === 'string' && !prop.startsWith('--')
        ? value.trim().toLowerCase()
        : ''
    if (!CSS_WIDE_KEYWORDS.has(keyword)) {
      // `all` only accepts CSS-wide keywords.
      if (prop !== 'all') defined[prop] = value
      continue
    }

    // `all` is every property but custom properties and `direction`.
    const affects = (key: string) =>
      prop === 'all'
        ? !key.startsWith('--') && key !== 'direction'
        : isLonghandOf(key, prop)
    for (const key in defined) if (affects(key)) delete defined[key]
    if (keyword === 'revert' || keyword === 'revert-layer') continue

    for (const key in preset) if (affects(key)) delete preset[key]
    if (keyword === 'initial' || (prop !== 'all' && !isInherited(prop))) {
      initial.add(prop)
    } else {
      initial.delete(prop)
    }
  }
  return { defined, initial }
}

/**
 * Elements that browsers hide: with the `hidden` attribute, unless it's
 * `until-found`, and hidden inputs.
 */
function getHiddenPreset(type: string, props: Record<string, any>) {
  const { hidden, type: inputType } = props ?? {}
  const hasHidden =
    hidden != null &&
    hidden !== false &&
    String(hidden).toLowerCase() !== 'until-found'
  const isHiddenInput =
    type === 'input' && String(inputType).toLowerCase() === 'hidden'
  return hasHidden || isHiddenInput ? { display: 'none' } : {}
}

function getDirPreset(props: Record<string, any>) {
  const dir = typeof props?.dir === 'string' ? props.dir.toLowerCase() : ''
  return dir === 'ltr' || dir === 'rtl' ? { direction: dir } : {}
}

/**
 * Snaps a border or outline width to device pixels: widths between 0 and 1
 * device pixel are rounded up, and wider ones down. Layouts that aren't
 * rounded, with a `pointScaleFactor` of 0, aren't snapped either.
 *
 * @see https://www.w3.org/TR/css-values-4/#snap-a-length-as-a-border-width
 */
function snapLineWidth(width: number, pointScaleFactor = 1) {
  if (!pointScaleFactor || width <= 0) return width
  const pixels = width * pointScaleFactor
  if (Math.abs(pixels - Math.round(pixels)) < 1e-6) return width
  return Math.max(1, Math.floor(pixels)) / pointScaleFactor
}

/**
 * The first error of a style, if it has an invalid or unsupported value, from
 * computing it for an element without context. Stylesheets drop these
 * declarations, like browsers.
 */
export async function getStyleError(
  style: Record<string, string | number>,
  convertColors = true
): Promise<Error | undefined> {
  let firstError: Error | undefined
  try {
    await compute(
      new LayoutNode(),
      'div',
      ROOT_STYLE,
      style,
      {},
      undefined,
      (error) => {
        firstError ??= error
      },
      convertColors
    )
  } catch (error) {
    firstError ??= error as Error
  }
  return firstError
}

export default async function compute(
  node: LayoutNode,
  type: SatoriElement | string,
  inheritedStyle: SerializedStyle,
  definedStyle: Record<string, string | number>,
  props: Record<string, any>,
  replacedElements?: ReplacedElementHandlers,
  onStyleError?: (error: Error) => void,
  convertColors = true,
  pointScaleFactor?: number,
  listDepth = 0
): Promise<[SerializedStyle, SerializedStyle]> {
  // With `onStyleError`, invalid values are reported and replaced by the
  // fallback, as if the declaration wasn't there.
  const lenient = <T>(resolve: () => T, fallback: T): T => {
    if (!onStyleError) return resolve()
    try {
      return resolve()
    } catch (error) {
      onStyleError(error)
      return fallback
    }
  }
  const v: typeof checkValue = (field, map, fallback, property) =>
    lenient(() => checkValue(field, map, fallback, property), fallback)

  // Extend the default style with defined and inherited styles. Like the user
  // agent stylesheet, the preset is computed together with the defined style,
  // e.g. `em` margins use the defined font size. Defined properties come after
  // the remaining preset ones, so they override them in order.
  const presetStyle = {
    ...presets[type],
    ...getListPresets(type, props, listDepth),
    ...getDirPreset(props),
    ...getHiddenPreset(type, props),
  }
  // Logical properties are physical ones of the element's direction.
  const ownDirection = String(definedStyle?.direction ?? '')
    .trim()
    .toLowerCase()
  const logicalDirection =
    ownDirection === 'ltr' || ownDirection === 'rtl'
      ? ownDirection
      : String(presetStyle.direction ?? inheritedStyle?.direction ?? 'ltr')
  const { defined, initial } = resolveKeywords(
    toPhysicalProperties(definedStyle, logicalDirection),
    presetStyle
  )
  for (const prop in defined) delete presetStyle[prop]

  // Properties without a value have their initial value, except the root
  // ones. Satori's own properties are kept.
  const base: SerializedStyle = { ...inheritedStyle }
  for (const prop of initial) {
    const resets = (key: string) =>
      prop === 'all'
        ? !key.startsWith('_') && !key.startsWith('--') && key !== 'direction'
        : isLonghandOf(key, prop)
    for (const key in base) if (resets(key)) delete base[key]
    for (const key in ROOT_STYLE) if (resets(key)) base[key] = ROOT_STYLE[key]
  }
  const style: SerializedStyle = Object.assign(
    base,
    expand({ ...presetStyle, ...defined }, base, onStyleError, convertColors)
  )

  // An `aspect-ratio` replaces the natural ratio of replaced elements, unless
  // it's `auto <ratio>`.
  const aspectRatio =
    typeof style.aspectRatio === 'number' ? style.aspectRatio : undefined
  const replacesNaturalRatio =
    aspectRatio !== undefined && !style._aspectRatioAuto

  if (type === 'img') {
    let [resolvedSrc, imageWidth, imageHeight] = await resolveImageData(
      props.src
    )

    // Cannot parse the image size (e.g. base64 data URI).
    if (imageWidth === undefined && imageHeight === undefined) {
      if (props.width === undefined || props.height === undefined) {
        throw new Error(
          'Image size cannot be determined. Please provide the width and height of the image.'
        )
      }
      imageWidth = parseInt(props.width)
      imageHeight = parseInt(props.height)
    }
    if (replacesNaturalRatio) imageHeight = imageWidth / aspectRatio

    setReplacedElementSize(
      node,
      style,
      imageWidth,
      imageHeight,
      // Images of list markers and generated content have their natural size.
      props.width ?? (props.__naturalSize ? imageWidth : undefined),
      props.height
    )
    style.__src = resolvedSrc
  }

  await replacedElements?.[type]?.(node, style, props)

  if (type === 'svg') {
    const viewBox = props.viewBox || props.viewbox
    const viewBoxSize = parseViewBox(viewBox)
    const ratio = replacesNaturalRatio
      ? 1 / aspectRatio
      : viewBoxSize
      ? viewBoxSize[3] / viewBoxSize[2]
      : null

    let { width, height } = props
    if (typeof width === 'undefined' && height) {
      if (ratio == null) {
        width = 0
      } else if (typeof height === 'string' && height.endsWith('%')) {
        width = parseInt(height) / ratio + '%'
      } else {
        height = lengthToNumber(
          height,
          inheritedStyle.fontSize,
          1,
          inheritedStyle
        )
        width = height / ratio
      }
    } else if (typeof height === 'undefined' && width) {
      if (ratio == null) {
        width = 0
      } else if (typeof width === 'string' && width.endsWith('%')) {
        height = parseInt(width) * ratio + '%'
      } else {
        width = lengthToNumber(
          width,
          inheritedStyle.fontSize,
          1,
          inheritedStyle
        )
        height = width * ratio
      }
    } else {
      if (typeof width !== 'undefined') {
        width =
          lengthToNumber(width, inheritedStyle.fontSize, 1, inheritedStyle) ||
          width
      }
      if (typeof height !== 'undefined') {
        height =
          lengthToNumber(height, inheritedStyle.fontSize, 1, inheritedStyle) ||
          height
      }
      width ||= viewBoxSize?.[2]
      height ||= viewBoxSize?.[3]
    }

    if (!style.width && width) style.width = width
    if (!style.height && height) style.height = height
  }

  // Set the layout style.
  const layout: LayoutStyle = node.style

  if (aspectRatio !== undefined && type !== 'img') {
    layout.aspectRatio = aspectRatio
  }

  if (style.order !== undefined) {
    layout.order = lenient(() => {
      const order = Number(style.order)
      if (!Number.isInteger(order)) {
        throw new Error(
          `Invalid value for CSS property "order": ${style.order}`
        )
      }
      return order
    }, undefined)
  }

  // `visibility` is inherited, so only the element's own value is checked.
  if (style.visibility !== inheritedStyle.visibility) {
    style.visibility = v(
      style.visibility,
      { visible: 'visible', hidden: 'hidden', collapse: 'hidden' },
      inheritedStyle.visibility ?? 'visible',
      'visibility'
    )
  }

  // The outer display type, how the element takes part in the layout of its
  // parent, and the inner one, how its children are laid out. Elements are
  // inline by default, and blockified in flex and grid containers, see
  // `layout()`.
  const [outerDisplay, boxInnerDisplay] = v(
    style.display,
    DISPLAY_TYPES,
    DISPLAY_TYPES.inline,
    'display'
  ) as [OuterDisplay, LayoutStyle['display'] | 'inline']
  // Like in browsers, a vertical `-webkit-box` with a line clamp is a block
  // container, whose lines are clamped. Otherwise, it's laid out like flex.
  // https://drafts.csswg.org/css-overflow-4/#webkit-line-clamp
  const innerDisplay =
    style.display === '-webkit-box' &&
    style.WebkitBoxOrient === 'vertical' &&
    Number(style.WebkitLineClamp) > 0
      ? 'flow-root'
      : boxInnerDisplay
  style.__outerDisplay = outerDisplay
  style.__innerDisplay = innerDisplay
  style.__listItem = (style.display === 'list-item') as any
  layout.display = innerDisplay === 'inline' ? 'block' : innerDisplay

  // The inline base direction, which is inherited. Flex rows, grid columns
  // and lines of text start at the right with `rtl`.
  const direction = v(
    style.direction,
    { ltr: 'ltr', rtl: 'rtl' },
    inheritedStyle.direction === 'rtl' ? 'rtl' : 'ltr',
    'direction'
  ) as 'ltr' | 'rtl'
  style.direction = direction
  layout.direction = direction
  const isRTL = direction === 'rtl'

  // `align-content` defaults to `normal`. In block containers, other values
  // prevent margins from collapsing.
  layout.alignContent =
    v(
      style.alignContent,
      {
        stretch: 'stretch',
        center: 'center',
        start: 'start',
        end: 'end',
        'flex-start': 'flex-start',
        'flex-end': 'flex-end',
        'space-between': 'space-between',
        'space-around': 'space-around',
        'space-evenly': 'space-evenly',
        baseline: 'flex-start',
        normal: null,
      },
      null,
      'alignContent'
    ) ?? undefined

  layout.alignItems =
    v(
      style.alignItems,
      {
        ...ITEM_ALIGNMENT,
        normal: null,
      },
      'stretch',
      'alignItems'
    ) ?? undefined
  layout.alignSelf =
    v(
      style.alignSelf,
      {
        ...ITEM_ALIGNMENT,
        normal: null,
        auto: null,
      },
      undefined,
      'alignSelf'
    ) ?? undefined
  // Unlike CSS, `justify-content` defaults to `flex-start` in flex containers.
  layout.justifyContent =
    v(
      style.justifyContent,
      {
        center: 'center',
        start: 'start',
        end: 'end',
        left: 'start',
        right: 'end',
        'flex-start': 'flex-start',
        'flex-end': 'flex-end',
        stretch: 'stretch',
        'space-between': 'space-between',
        'space-around': 'space-around',
        'space-evenly': 'space-evenly',
        normal: null,
      },
      layout.display === 'flex' ? 'flex-start' : null,
      'justifyContent'
    ) ?? undefined
  layout.justifyItems =
    v(
      style.justifyItems,
      {
        ...ITEM_ALIGNMENT,
        left: 'start',
        right: 'end',
        normal: null,
        legacy: null,
      },
      undefined,
      'justifyItems'
    ) ?? undefined
  layout.justifySelf =
    v(
      style.justifySelf,
      {
        ...ITEM_ALIGNMENT,
        left: 'start',
        right: 'end',
        normal: null,
        auto: null,
      },
      undefined,
      'justifySelf'
    ) ?? undefined

  if (layout.display === 'grid') {
    const fontSize = (style.fontSize ?? inheritedStyle.fontSize) as number
    const resolveLength = (length: string) =>
      lengthToNumber(length, fontSize, 0, inheritedStyle)
    layout.gridTemplateColumns = lenient(
      () =>
        parseGridTrackList(
          style.gridTemplateColumns,
          resolveLength,
          'gridTemplateColumns'
        ),
      undefined
    )
    layout.gridTemplateRows = lenient(
      () =>
        parseGridTrackList(
          style.gridTemplateRows,
          resolveLength,
          'gridTemplateRows'
        ),
      undefined
    )
    layout.gridAutoColumns = lenient(
      () =>
        parseGridAutoTracks(
          style.gridAutoColumns,
          resolveLength,
          'gridAutoColumns'
        ),
      undefined
    )
    layout.gridAutoRows = lenient(
      () =>
        parseGridAutoTracks(style.gridAutoRows, resolveLength, 'gridAutoRows'),
      undefined
    )
    layout.gridAutoFlow = lenient(
      () => parseGridAutoFlow(style.gridAutoFlow as string),
      undefined
    )
    layout.gridTemplateAreas = lenient(
      () => parseGridTemplateAreas(style.gridTemplateAreas as string),
      undefined
    )
  }
  for (const line of [
    'gridRowStart',
    'gridRowEnd',
    'gridColumnStart',
    'gridColumnEnd',
  ] as const) {
    layout[line] = lenient(() => parseGridLine(style[line], line), undefined)
  }

  layout.flexDirection = v(
    style.flexDirection,
    {
      row: 'row',
      column: 'column',
      'row-reverse': 'row-reverse',
      'column-reverse': 'column-reverse',
    },
    'row',
    'flexDirection'
  )
  layout.flexWrap = v(
    style.flexWrap,
    {
      wrap: 'wrap',
      nowrap: 'nowrap',
      'wrap-reverse': 'wrap-reverse',
    },
    'nowrap',
    'flexWrap'
  )

  // `left` and `right` are physical. On the inline axis, they're the end and
  // the start with `rtl`, and otherwise they're the start.
  if (isRTL) {
    const PHYSICAL = { left: 'end', right: 'start' } as const
    const isInlineAxis =
      layout.display === 'grid' ||
      (layout.display === 'flex' &&
        (layout.flexDirection === 'row' ||
          layout.flexDirection === 'row-reverse'))
    if (isInlineAxis && PHYSICAL[style.justifyContent as string]) {
      layout.justifyContent = PHYSICAL[style.justifyContent as string]
    }
    for (const prop of ['justifyItems', 'justifySelf'] as const) {
      if (PHYSICAL[style[prop] as string]) {
        layout[prop] = PHYSICAL[style[prop] as string]
      }
    }
  }

  if (typeof style.gap !== 'undefined') {
    layout.rowGap = layout.columnGap = style.gap as number
  }
  if (typeof style.rowGap !== 'undefined') {
    layout.rowGap = style.rowGap as number
  }
  if (typeof style.columnGap !== 'undefined') {
    layout.columnGap = style.columnGap as number
  }

  if (typeof style.flexBasis !== 'undefined') {
    layout.flexBasis = asSize(style.flexBasis, 'flexBasis')
  }
  layout.flexGrow = typeof style.flexGrow === 'undefined' ? 0 : style.flexGrow
  layout.flexShrink =
    typeof style.flexShrink === 'undefined' ? 1 : style.flexShrink

  if (typeof style.maxHeight !== 'undefined') {
    layout.maxHeight = asSize(style.maxHeight, 'maxHeight')
  }
  if (typeof style.maxWidth !== 'undefined') {
    layout.maxWidth = asSize(style.maxWidth, 'maxWidth')
  }
  if (typeof style.minHeight !== 'undefined') {
    layout.minHeight = asSize(style.minHeight, 'minHeight')
  }
  if (typeof style.minWidth !== 'undefined') {
    layout.minWidth = asSize(style.minWidth, 'minWidth')
  }

  // `visible` and `clip` don't make the box a scroll container, so with a
  // value that does on the other axis, they're `auto` and `hidden`.
  // https://drafts.csswg.org/css-overflow-3/#overflow-control
  const OVERFLOW = {
    visible: 'visible',
    hidden: 'hidden',
    clip: 'clip',
    scroll: 'scroll',
    auto: 'auto',
  } as const
  let overflowX = v(style.overflowX, OVERFLOW, 'visible', 'overflowX')
  let overflowY = v(style.overflowY, OVERFLOW, 'visible', 'overflowY')
  const isScrolling = (value: string) => value !== 'visible' && value !== 'clip'
  if (isScrolling(overflowX) !== isScrolling(overflowY)) {
    const toScrolling = (value: string) =>
      value === 'visible' ? 'auto' : value === 'clip' ? 'hidden' : value
    overflowX = toScrolling(overflowX)
    overflowY = toScrolling(overflowY)
  }
  style.overflowX = overflowX
  style.overflowY = overflowY
  // Whether the content is clipped on any axis.
  style.overflow =
    overflowX === 'visible' && overflowY === 'visible' ? 'visible' : 'hidden'
  const LAYOUT_OVERFLOW = {
    visible: 'visible',
    clip: 'clip',
    hidden: 'hidden',
    auto: 'hidden',
    scroll: 'scroll',
  } as const
  layout.overflowX = LAYOUT_OVERFLOW[overflowX]
  layout.overflowY = LAYOUT_OVERFLOW[overflowY]

  layout.marginTop = asPointAutoPercentageLength(style.marginTop || 0)
  layout.marginBottom = asPointAutoPercentageLength(style.marginBottom || 0)
  layout.marginLeft = asPointAutoPercentageLength(style.marginLeft || 0)
  layout.marginRight = asPointAutoPercentageLength(style.marginRight || 0)

  // A side without a border style has no width. The width defaults to
  // `medium`, and the color to the current color.
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
    const lineStyle = style[`border${side}Style`]
    if (!lineStyle || lineStyle === 'none' || lineStyle === 'hidden') {
      style[`border${side}Width`] = 0
    } else {
      if (style[`border${side}Width`] === undefined) {
        style[`border${side}Width`] = 3
      }
      if (style[`border${side}Color`] === undefined) {
        style[`border${side}Color`] = style.color
      }
    }
  }

  // Border and outline widths are snapped to device pixels.
  for (const prop of [
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'outlineWidth',
  ]) {
    if (typeof style[prop] === 'number') {
      style[prop] = snapLineWidth(style[prop] as number, pointScaleFactor)
    }
  }

  layout.borderTopWidth = (style.borderTopWidth as number) || 0
  layout.borderBottomWidth = (style.borderBottomWidth as number) || 0
  layout.borderLeftWidth = (style.borderLeftWidth as number) || 0
  layout.borderRightWidth = (style.borderRightWidth as number) || 0

  layout.paddingTop = (style.paddingTop as Length) || 0
  layout.paddingBottom = (style.paddingBottom as Length) || 0
  layout.paddingLeft = (style.paddingLeft as Length) || 0
  layout.paddingRight = (style.paddingRight as Length) || 0

  layout.boxSizing = v(
    style.boxSizing,
    {
      'border-box': 'border-box',
      'content-box': 'content-box',
    },
    'content-box',
    'boxSizing'
  )

  const position = v(
    style.position,
    {
      absolute: 'absolute',
      relative: 'relative',
      static: 'static',
      // Laid out in its containing block, see `fixed-position.ts`.
      fixed: 'fixed',
      // Moved after the layout, see `getStickyOffset()`.
      sticky: 'sticky',
    },
    'static',
    'position'
  )
  style.position = position
  layout.position =
    position === 'absolute' || position === 'fixed' ? 'absolute' : 'relative'

  // Floats only apply in block containers, see `layout()`.
  const inlineStart = isRTL ? 'right' : 'left'
  const inlineEnd = isRTL ? 'left' : 'right'
  const float = v(
    style.float,
    {
      none: 'none',
      left: 'left',
      right: 'right',
      'inline-start': inlineStart,
      'inline-end': inlineEnd,
    },
    'none',
    'float'
  )
  layout.float =
    float === 'none' || layout.position === 'absolute' ? undefined : float
  layout.clear = v(
    style.clear,
    {
      none: 'none',
      left: 'left',
      right: 'right',
      both: 'both',
      'inline-start': inlineStart,
      'inline-end': inlineEnd,
    },
    'none',
    'clear'
  )

  // Static elements ignore insets, and sticky elements are moved after the
  // layout.
  if (position !== 'static' && position !== 'sticky') {
    for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
      if (typeof style[edge] !== 'undefined') {
        layout[edge] = asPointPercentageLength(style[edge], edge)
      }
    }
  }

  layout.height =
    typeof style.height !== 'undefined'
      ? asSize(style.height, 'height')
      : 'auto'
  layout.width =
    typeof style.width !== 'undefined' ? asSize(style.width, 'width') : 'auto'

  layout.replaced =
    type === 'img' || type === 'svg' || !!replacedElements?.[type]

  return [style, inheritable(style)]
}
