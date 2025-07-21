/**
 * Handler to update the Yoga node properties with the given element type and
 * style. Each supported element has its own preset styles, so this function
 * also returns the inherited style for children of the element.
 */

import presets from './presets.js'
import inheritable from './inheritable.js'
import expand, { SerializedStyle } from './expand.js'
import {
  asPointAutoPercentageLength,
  asPointPercentageLength,
  getYoga,
  lengthToNumber,
  parseViewBox,
  v,
  YogaNode,
} from '../utils.js'
import { resolveImageData } from './image.js'

type SatoriElement = keyof typeof presets

export default async function compute(
  node: YogaNode,
  type: SatoriElement | string,
  inheritedStyle: SerializedStyle,
  definedStyle: Record<string, string | number>,
  props: Record<string, any>
): Promise<[SerializedStyle, SerializedStyle]> {
  const Yoga = await getYoga()

  // Extend the default style with defined and inherited styles.
  const style: SerializedStyle = {
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

    let contentBoxWidth = style.width || props.width
    let contentBoxHeight = style.height || props.height

    const isAbsoluteContentSize =
      typeof contentBoxWidth === 'number' &&
      typeof contentBoxHeight === 'number'

    if (isAbsoluteContentSize) {
      contentBoxWidth -= extraHorizontal
      contentBoxHeight -= extraVertical
    }

    // When no content size is defined, we use the image size as the content size.
    if (contentBoxWidth === undefined && contentBoxHeight === undefined) {
      contentBoxWidth = '100%'
      node.setAspectRatio(1 / r)
    } else {
      // If only one sisde is not defined, we can calculate the other one.
      if (contentBoxWidth === undefined) {
        if (typeof contentBoxHeight === 'number') {
          contentBoxWidth = contentBoxHeight / r
        } else {
          // If it uses a relative value (e.g. 50%), we can rely on aspect ratio.
          // Note: this doesn't work well if there are paddings or borders.
          node.setAspectRatio(1 / r)
        }
      } else if (contentBoxHeight === undefined) {
        if (typeof contentBoxWidth === 'number') {
          contentBoxHeight = contentBoxWidth * r
        } else {
          // If it uses a relative value (e.g. 50%), we can rely on aspect ratio.
          // Note: this doesn't work well if there are paddings or borders.
          node.setAspectRatio(1 / r)
        }
      }
    }

    style.width = isAbsoluteContentSize
      ? (contentBoxWidth as number) + extraHorizontal
      : contentBoxWidth
    style.height = isAbsoluteContentSize
      ? (contentBoxHeight as number) + extraVertical
      : contentBoxHeight
    style.__src = resolvedSrc
  }

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

  // Set properties for Yoga.
  node.setDisplay(
    v(
      style.display,
      {
        flex: Yoga.DISPLAY_FLEX,
        block: Yoga.DISPLAY_FLEX,
        contents: Yoga.DISPLAY_CONTENTS,
        none: Yoga.DISPLAY_NONE,
        '-webkit-box': Yoga.DISPLAY_FLEX,
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
      Yoga.ALIGN_STRETCH,
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

  if (typeof style.gap !== 'undefined') {
    node.setGap(Yoga.GUTTER_ALL, style.gap)
  }

  if (typeof style.rowGap !== 'undefined') {
    node.setGap(Yoga.GUTTER_ROW, style.rowGap)
  }

  if (typeof style.columnGap !== 'undefined') {
    node.setGap(Yoga.GUTTER_COLUMN, style.columnGap)
  }

  // @TODO: node.setFlex

  if (typeof style.flexBasis !== 'undefined') {
    node.setFlexBasis(asPointAutoPercentageLength(style.flexBasis, 'flexBasis'))
  }
  node.setFlexGrow(typeof style.flexGrow === 'undefined' ? 0 : style.flexGrow)
  node.setFlexShrink(
    typeof style.flexShrink === 'undefined' ? 0 : style.flexShrink
  )

  if (typeof style.maxHeight !== 'undefined') {
    node.setMaxHeight(asPointPercentageLength(style.maxHeight, 'maxHeight'))
  }
  if (typeof style.maxWidth !== 'undefined') {
    node.setMaxWidth(asPointPercentageLength(style.maxWidth, 'maxWidth'))
  }
  if (typeof style.minHeight !== 'undefined') {
    node.setMinHeight(asPointPercentageLength(style.minHeight, 'minHeight'))
  }
  if (typeof style.minWidth !== 'undefined') {
    node.setMinWidth(asPointPercentageLength(style.minWidth, 'minWidth'))
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

  node.setMargin(
    Yoga.EDGE_TOP,
    asPointAutoPercentageLength(style.marginTop || 0)
  )
  node.setMargin(
    Yoga.EDGE_BOTTOM,
    asPointAutoPercentageLength(style.marginBottom || 0)
  )
  node.setMargin(
    Yoga.EDGE_LEFT,
    asPointAutoPercentageLength(style.marginLeft || 0)
  )
  node.setMargin(
    Yoga.EDGE_RIGHT,
    asPointAutoPercentageLength(style.marginRight || 0)
  )

  node.setBorder(Yoga.EDGE_TOP, style.borderTopWidth || 0)
  node.setBorder(Yoga.EDGE_BOTTOM, style.borderBottomWidth || 0)
  node.setBorder(Yoga.EDGE_LEFT, style.borderLeftWidth || 0)
  node.setBorder(Yoga.EDGE_RIGHT, style.borderRightWidth || 0)

  node.setPadding(Yoga.EDGE_TOP, style.paddingTop || 0)
  node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom || 0)
  node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft || 0)
  node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight || 0)

  node.setBoxSizing(
    v(
      style.boxSizing,
      {
        'border-box': Yoga.BOX_SIZING_BORDER_BOX,
        'content-box': Yoga.BOX_SIZING_CONTENT_BOX,
      },
      Yoga.BOX_SIZING_BORDER_BOX,
      'boxSizing'
    )
  )

  node.setPositionType(
    v(
      style.position,
      {
        absolute: Yoga.POSITION_TYPE_ABSOLUTE,
        relative: Yoga.POSITION_TYPE_RELATIVE,
        static: Yoga.POSITION_TYPE_STATIC,
      },
      Yoga.POSITION_TYPE_RELATIVE,
      'position'
    )
  )

  if (typeof style.top !== 'undefined') {
    node.setPosition(Yoga.EDGE_TOP, asPointPercentageLength(style.top, 'top'))
  }
  if (typeof style.bottom !== 'undefined') {
    node.setPosition(
      Yoga.EDGE_BOTTOM,
      asPointPercentageLength(style.bottom, 'bottom')
    )
  }
  if (typeof style.left !== 'undefined') {
    node.setPosition(
      Yoga.EDGE_LEFT,
      asPointPercentageLength(style.left, 'left')
    )
  }
  if (typeof style.right !== 'undefined') {
    node.setPosition(
      Yoga.EDGE_RIGHT,
      asPointPercentageLength(style.right, 'right')
    )
  }

  if (typeof style.height !== 'undefined') {
    node.setHeight(asPointAutoPercentageLength(style.height, 'height'))
  } else {
    node.setHeightAuto()
  }
  if (typeof style.width !== 'undefined') {
    node.setWidth(asPointAutoPercentageLength(style.width, 'width'))
  } else {
    node.setWidthAuto()
  }

  return [style, inheritable(style)]
}
