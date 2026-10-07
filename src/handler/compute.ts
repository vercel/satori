/**
 * Handler to update the layout node style with the given element type and
 * style. Each supported element has its own preset styles, so this function
 * also returns the inherited style for children of the element.
 */

import presets from './presets.js'
import inheritable from './inheritable.js'
import expand, { SerializedStyle } from './expand.js'
import {
  asPointAutoPercentageLength,
  asPointPercentageLength,
  lengthToNumber,
  parseViewBox,
  v,
} from '../utils.js'
import type { LayoutNode, LayoutStyle, Length } from '../layout-engine/index.js'
import { resolveImageData } from './image.js'

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

  // Before calculating the missing width or height based on the image ratio,
  // we must subtract the padding and border due to how box model works.
  // TODO: Ensure these are absolute length values, not relative values.
  let extraHorizontal =
    (style.borderLeftWidth || 0) +
    (style.borderRightWidth || 0) +
    (style.paddingLeft || 0) +
    (style.paddingRight || 0)
  let extraVertical =
    (style.borderTopWidth || 0) +
    (style.borderBottomWidth || 0) +
    (style.paddingTop || 0) +
    (style.paddingBottom || 0)

  let contentBoxWidth = style.width || attributeWidth
  let contentBoxHeight = style.height || attributeHeight

  const isAbsoluteContentSize =
    typeof contentBoxWidth === 'number' && typeof contentBoxHeight === 'number'

  if (isAbsoluteContentSize) {
    contentBoxWidth = (contentBoxWidth as number) - extraHorizontal
    contentBoxHeight = (contentBoxHeight as number) - extraVertical
  }

  // When no content size is defined, we use the image size as the content size.
  if (contentBoxWidth === undefined && contentBoxHeight === undefined) {
    contentBoxWidth = '100%'
    node.style.aspectRatio = 1 / r
  } else {
    // If only one sisde is not defined, we can calculate the other one.
    if (contentBoxWidth === undefined) {
      if (typeof contentBoxHeight === 'number') {
        contentBoxWidth = contentBoxHeight / r
      } else {
        // If it uses a relative value (e.g. 50%), we can rely on aspect ratio.
        // Note: this doesn't work well if there are paddings or borders.
        node.style.aspectRatio = 1 / r
      }
    } else if (contentBoxHeight === undefined) {
      if (typeof contentBoxWidth === 'number') {
        contentBoxHeight = contentBoxWidth * r
      } else {
        // If it uses a relative value (e.g. 50%), we can rely on aspect ratio.
        // Note: this doesn't work well if there are paddings or borders.
        node.style.aspectRatio = 1 / r
      }
    }
  }

  style.width = isAbsoluteContentSize
    ? (contentBoxWidth as number) + extraHorizontal
    : contentBoxWidth
  style.height = isAbsoluteContentSize
    ? (contentBoxHeight as number) + extraVertical
    : contentBoxHeight
  style.__naturalWidth = naturalWidth
  style.__naturalHeight = naturalHeight
}

export default async function compute(
  node: LayoutNode,
  type: SatoriElement | string,
  inheritedStyle: SerializedStyle,
  definedStyle: Record<string, string | number>,
  props: Record<string, any>,
  replacedElements?: ReplacedElementHandlers
): Promise<[SerializedStyle, SerializedStyle]> {
  // Extend the default style with defined and inherited styles.
  const style: SerializedStyle = Object.assign(
    {},
    inheritedStyle,
    expand(presets[type], inheritedStyle),
    expand(definedStyle, inheritedStyle)
  )

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

    setReplacedElementSize(
      node,
      style,
      imageWidth,
      imageHeight,
      props.width,
      props.height
    )
    style.__src = resolvedSrc
  }

  await replacedElements?.[type]?.(node, style, props)

  if (type === 'svg') {
    const viewBox = props.viewBox || props.viewbox
    const viewBoxSize = parseViewBox(viewBox)
    const ratio = viewBoxSize ? viewBoxSize[3] / viewBoxSize[2] : null

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

  layout.display = v(
    style.display,
    {
      flex: 'flex',
      block: 'block',
      contents: 'contents',
      none: 'none',
      '-webkit-box': 'flex',
    },
    'flex',
    'display'
  )

  // Unlike CSS, `align-content` defaults to `flex-start` in flex containers.
  // In block containers, other values prevent margins from collapsing.
  layout.alignContent =
    v(
      style.alignContent,
      {
        stretch: 'stretch',
        center: 'center',
        'flex-start': 'flex-start',
        'flex-end': 'flex-end',
        'space-between': 'space-between',
        'space-around': 'space-around',
        'space-evenly': 'space-evenly',
        baseline: 'flex-start',
        normal: null,
      },
      layout.display === 'flex' ? 'flex-start' : null,
      'alignContent'
    ) ?? undefined

  layout.alignItems =
    v(
      style.alignItems,
      {
        stretch: 'stretch',
        center: 'center',
        'flex-start': 'flex-start',
        'flex-end': 'flex-end',
        baseline: 'baseline',
        normal: null,
      },
      'stretch',
      'alignItems'
    ) ?? undefined
  layout.alignSelf =
    v(
      style.alignSelf,
      {
        stretch: 'stretch',
        center: 'center',
        'flex-start': 'flex-start',
        'flex-end': 'flex-end',
        baseline: 'baseline',
        normal: null,
        auto: null,
      },
      undefined,
      'alignSelf'
    ) ?? undefined
  layout.justifyContent = v(
    style.justifyContent,
    {
      center: 'center',
      'flex-start': 'flex-start',
      'flex-end': 'flex-end',
      'space-between': 'space-between',
      'space-around': 'space-around',
      'space-evenly': 'space-evenly',
    },
    'flex-start',
    'justifyContent'
  )

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
    layout.flexBasis = asPointAutoPercentageLength(style.flexBasis, 'flexBasis')
  }
  layout.flexGrow = typeof style.flexGrow === 'undefined' ? 0 : style.flexGrow
  layout.flexShrink =
    typeof style.flexShrink === 'undefined' ? 1 : style.flexShrink

  if (typeof style.maxHeight !== 'undefined') {
    layout.maxHeight = asPointPercentageLength(style.maxHeight, 'maxHeight')
  }
  if (typeof style.maxWidth !== 'undefined') {
    layout.maxWidth = asPointPercentageLength(style.maxWidth, 'maxWidth')
  }
  if (typeof style.minHeight !== 'undefined') {
    layout.minHeight = asPointPercentageLength(style.minHeight, 'minHeight')
  }
  if (typeof style.minWidth !== 'undefined') {
    layout.minWidth = asPointPercentageLength(style.minWidth, 'minWidth')
  }

  layout.overflow = v(
    style.overflow,
    {
      visible: 'visible',
      hidden: 'hidden',
    },
    'visible',
    'overflow'
  )

  layout.marginTop = asPointAutoPercentageLength(style.marginTop || 0)
  layout.marginBottom = asPointAutoPercentageLength(style.marginBottom || 0)
  layout.marginLeft = asPointAutoPercentageLength(style.marginLeft || 0)
  layout.marginRight = asPointAutoPercentageLength(style.marginRight || 0)

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
    'border-box',
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
    },
    'relative',
    'position'
  )
  layout.position =
    position === 'absolute' || position === 'fixed' ? 'absolute' : 'relative'

  // Static elements ignore insets.
  if (position !== 'static') {
    for (const edge of ['top', 'bottom', 'left', 'right'] as const) {
      if (typeof style[edge] !== 'undefined') {
        layout[edge] = asPointPercentageLength(style[edge], edge)
      }
    }
  }

  layout.height =
    typeof style.height !== 'undefined'
      ? asPointAutoPercentageLength(style.height, 'height')
      : 'auto'
  layout.width =
    typeof style.width !== 'undefined'
      ? asPointAutoPercentageLength(style.width, 'width')
      : 'auto'

  layout.replaced =
    type === 'img' || type === 'svg' || !!replacedElements?.[type]

  return [style, inheritable(style)]
}
