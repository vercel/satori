/**
 * Handler to update the Yoga node properties with the given element type and
 * style. Each supported element has its own preset styles, so this function
 * also returns the inherited style for children of the element.
 */

import type { YogaNode } from 'yoga-layout'

import getYoga from '../yoga'
import presets from './presets'
import inheritable from './inheritable'
import expand from './expand'
import { v } from '../utils'
import { resolveImageData } from './image'

type SatoriElement = keyof typeof presets

export default async function handler(
  node: YogaNode,
  type: SatoriElement | string,
  inheritedStyle: Record<string, string | number>,
  definedStyle: Record<string, string | number>,
  props: Record<string, any>
): Promise<[Record<string, string | number>, Record<string, string | number>]> {
  const Yoga = getYoga()

  // Extend the default style with defined and inherited styles.
  const style = {
    ...inheritedStyle,
    ...expand(presets[type], inheritedStyle),
    ...expand(definedStyle, inheritedStyle),
  }

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
    const r = imageHeight / imageWidth

    // Before calculating the missing width or height based on the image ratio,
    // we must subtract the padding and border due to how box model works.
    let extraWidthHorizontal =
      ((style.borderLeftWidth as number) || 0) +
      ((style.borderRightWidth as number) || 0) +
      ((style.paddingLeft as number) || 0) +
      ((style.paddingRight as number) || 0)
    let extraWidthVertical =
      ((style.borderTopWidth as number) || 0) +
      ((style.borderBottomWidth as number) || 0) +
      ((style.paddingTop as number) || 0) +
      ((style.paddingBottom as number) || 0)
    let displayedWidth = style.width || props.width
    let displayedHeight = style.height || props.height
    const calculateInsetRatio =
      typeof displayedWidth !== 'string' && typeof displayedHeight !== 'string'

    if (displayedWidth !== undefined && calculateInsetRatio) {
      displayedWidth -= extraWidthHorizontal
    }
    if (displayedHeight !== undefined && calculateInsetRatio) {
      displayedHeight -= extraWidthVertical
    }

    if (displayedWidth === undefined && displayedHeight === undefined) {
      displayedWidth = imageWidth
      displayedHeight = imageHeight
    }

    if (displayedWidth === undefined) {
      displayedWidth = displayedHeight / r
    }
    if (displayedHeight === undefined) {
      displayedHeight = displayedWidth * r
    }

    style.width = calculateInsetRatio
      ? displayedWidth + extraWidthHorizontal
      : displayedWidth
    style.height = calculateInsetRatio
      ? displayedHeight + extraWidthVertical
      : displayedHeight
    style.__src = resolvedSrc
  }

  if (type === 'svg') {
    const viewBox = props.viewBox || props.viewbox
    const viewBoxSize = viewBox.split(' ').map((v) => parseInt(v, 10))
    const ratio = viewBoxSize[3] / viewBoxSize[2]

    let { width, height } = props
    if (typeof width === 'undefined' && height) {
      if (typeof height === 'string' && height.endsWith('%')) {
        width = parseInt(height) / ratio + '%'
      } else {
        width = parseInt(height) / ratio
      }
    } else if (typeof height === 'undefined' && width) {
      if (typeof width === 'string' && width.endsWith('%')) {
        height = parseInt(width) * ratio + '%'
      } else {
        height = parseInt(width) * ratio
      }
    } else {
      width ||= viewBoxSize[2]
      height ||= viewBoxSize[3]
    }

    if (!style.width) style.width = width
    if (!style.height) style.height = height
  }

  // Set properties for Yoga.
  node.setDisplay(
    v(
      style.display,
      {
        flex: Yoga.DISPLAY_FLEX,
        none: Yoga.DISPLAY_NONE,
      },
      Yoga.DISPLAY_FLEX,
      'display'
    )
  )

  node.setAlignContent(
    v(
      style.alignContent,
      {
        stretch: Yoga.ALIGN_STRETCH,
        center: Yoga.ALIGN_CENTER,
        'flex-start': Yoga.ALIGN_FLEX_START,
        'flex-end': Yoga.ALIGN_FLEX_END,
        'space-between': Yoga.ALIGN_SPACE_BETWEEN,
        'space-around': Yoga.ALIGN_SPACE_AROUND,
        baseline: Yoga.ALIGN_BASELINE,
        normal: Yoga.ALIGN_AUTO,
      },
      Yoga.ALIGN_AUTO,
      'alignContent'
    )
  )

  node.setAlignItems(
    v(
      style.alignItems,
      {
        stretch: Yoga.ALIGN_STRETCH,
        center: Yoga.ALIGN_CENTER,
        'flex-start': Yoga.ALIGN_FLEX_START,
        'flex-end': Yoga.ALIGN_FLEX_END,
        baseline: Yoga.ALIGN_BASELINE,
        normal: Yoga.ALIGN_AUTO,
      },
      Yoga.ALIGN_FLEX_START,
      'alignItems'
    )
  )
  node.setAlignSelf(
    v(
      style.alignSelf,
      {
        stretch: Yoga.ALIGN_STRETCH,
        center: Yoga.ALIGN_CENTER,
        'flex-start': Yoga.ALIGN_FLEX_START,
        'flex-end': Yoga.ALIGN_FLEX_END,
        baseline: Yoga.ALIGN_BASELINE,
        normal: Yoga.ALIGN_AUTO,
      },
      Yoga.ALIGN_AUTO,
      'alignSelf'
    )
  )
  node.setJustifyContent(
    v(
      style.justifyContent,
      {
        center: Yoga.JUSTIFY_CENTER,
        'flex-start': Yoga.JUSTIFY_FLEX_START,
        'flex-end': Yoga.JUSTIFY_FLEX_END,
        'space-between': Yoga.JUSTIFY_SPACE_BETWEEN,
        'space-around': Yoga.JUSTIFY_SPACE_AROUND,
      },
      Yoga.JUSTIFY_FLEX_START,
      'justifyContent'
    )
  )
  // @TODO: node.setAspectRatio

  node.setFlexDirection(
    v(
      style.flexDirection,
      {
        row: Yoga.FLEX_DIRECTION_ROW,
        column: Yoga.FLEX_DIRECTION_COLUMN,
        'row-reverse': Yoga.FLEX_DIRECTION_ROW_REVERSE,
        'column-reverse': Yoga.FLEX_DIRECTION_COLUMN_REVERSE,
      },
      Yoga.FLEX_DIRECTION_ROW,
      'flexDirection'
    )
  )
  node.setFlexWrap(
    v(
      style.flexWrap,
      {
        wrap: Yoga.WRAP_WRAP,
        nowrap: Yoga.WRAP_NO_WRAP,
        'wrap-reverse': Yoga.WRAP_WRAP_REVERSE,
      },
      Yoga.WRAP_NO_WRAP,
      'flexWrap'
    )
  )

  // @TODO: node.setFlex

  if (typeof style.flexBasis !== 'undefined') {
    // We can't use `auto` here due to this:
    // https://github.com/facebook/yoga/pull/1112
    // @TODO: We need a fork to add this API.
    node.setFlexBasis(style.flexBasis)
  }
  node.setFlexGrow(
    typeof style.flexGrow === 'undefined' ? 0 : (style.flexGrow as number)
  )
  node.setFlexShrink(
    typeof style.flexShrink === 'undefined' ? 0 : (style.flexShrink as number)
  )

  if (typeof style.maxHeight !== 'undefined') {
    node.setMaxHeight(style.maxHeight)
  }
  if (typeof style.maxWidth !== 'undefined') {
    node.setMaxWidth(style.maxWidth)
  }
  if (typeof style.minHeight !== 'undefined') {
    node.setMinHeight(style.minHeight)
  }
  if (typeof style.minWidth !== 'undefined') {
    node.setMinWidth(style.minWidth)
  }

  node.setOverflow(
    v(
      style.overflow,
      {
        visible: Yoga.OVERFLOW_VISIBLE,
        hidden: Yoga.OVERFLOW_HIDDEN,
      },
      Yoga.OVERFLOW_VISIBLE,
      'overflow'
    )
  )

  node.setMargin(Yoga.EDGE_TOP, (style.marginTop as number) || 0)
  node.setMargin(Yoga.EDGE_BOTTOM, (style.marginBottom as number) || 0)
  node.setMargin(Yoga.EDGE_LEFT, (style.marginLeft as number) || 0)
  node.setMargin(Yoga.EDGE_RIGHT, (style.marginRight as number) || 0)

  node.setBorder(Yoga.EDGE_TOP, (style.borderTopWidth as number) || 0)
  node.setBorder(Yoga.EDGE_BOTTOM, (style.borderBottomWidth as number) || 0)
  node.setBorder(Yoga.EDGE_LEFT, (style.borderLeftWidth as number) || 0)
  node.setBorder(Yoga.EDGE_RIGHT, (style.borderRightWidth as number) || 0)

  node.setPadding(Yoga.EDGE_TOP, style.paddingTop || 0)
  node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom || 0)
  node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft || 0)
  node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight || 0)

  node.setPositionType(
    v(
      style.position,
      {
        absolute: Yoga.POSITION_TYPE_ABSOLUTE,
        relative: Yoga.POSITION_TYPE_RELATIVE,
      },
      Yoga.POSITION_TYPE_RELATIVE,
      'position'
    )
  )

  if (typeof style.top !== 'undefined') {
    node.setPosition(Yoga.EDGE_TOP, style.top)
  }
  if (typeof style.bottom !== 'undefined') {
    node.setPosition(Yoga.EDGE_BOTTOM, style.bottom)
  }
  if (typeof style.left !== 'undefined') {
    node.setPosition(Yoga.EDGE_LEFT, style.left)
  }
  if (typeof style.right !== 'undefined') {
    node.setPosition(Yoga.EDGE_RIGHT, style.right)
  }

  if (typeof style.height !== 'undefined') {
    node.setHeight(style.height)
  } else {
    node.setHeightAuto()
  }
  if (typeof style.width !== 'undefined') {
    node.setWidth(style.width)
  } else {
    node.setWidthAuto()
  }

  return [style, inheritable(style)]
}
