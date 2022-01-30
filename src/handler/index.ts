/**
 * Handler to update the Yoga node properties with the given element type and
 * style. Each supported element has its own preset styles, so this function
 * also returns the inherited style for children of the element.
 */

import type { YogaNode } from 'yoga-layout-prebuilt'

import Yoga from 'yoga-layout-prebuilt'
import presets from './presets'

type SatoriElement = keyof typeof presets

function v(field: string, map: Record<string, any>, fallback: any) {
  const value = map[field]
  return typeof value === 'undefined' ? fallback : value
}

export default function handler(
  node: YogaNode,
  type: SatoriElement | string,
  inheritedStyle: Record<string, string | number>
): Record<string, string | number> {
  // Extend the default style with defined and inherited styles.
  const style = { ...presets[type], ...inheritedStyle }

  // Set properties for Yoga.
  node.setDisplay(
    v(
      style.display,
      {
        flex: Yoga.DISPLAY_FLEX,
        none: Yoga.DISPLAY_NONE,
      },
      Yoga.DISPLAY_FLEX
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
      Yoga.ALIGN_AUTO
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
      Yoga.ALIGN_AUTO
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
      Yoga.ALIGN_AUTO
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
      Yoga.JUSTIFY_FLEX_START
    )
  )
  // @TODO: node.setAspectRatio

  // @TODO: node.setFlex
  if (typeof style.flexBasis !== 'undefined') {
    node.setFlexBasis(style.flexBasis)
  }
  node.setFlexDirection(
    v(
      style.flexDirection,
      {
        row: Yoga.FLEX_DIRECTION_ROW,
        column: Yoga.FLEX_DIRECTION_COLUMN,
        'row-reverse': Yoga.FLEX_DIRECTION_ROW_REVERSE,
        'column-reverse': Yoga.FLEX_DIRECTION_COLUMN_REVERSE,
      },
      Yoga.FLEX_DIRECTION_ROW
    )
  )
  node.setFlexGrow(style.flexGrow || 0)
  node.setFlexShrink(style.flexShrink || 1)
  node.setFlexWrap(
    v(
      style.flexWrap,
      {
        wrap: Yoga.WRAP_WRAP,
        nowrap: Yoga.WRAP_NO_WRAP,
        'wrap-reverse': Yoga.WRAP_WRAP_REVERSE,
      },
      Yoga.WRAP_WRAP
    )
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
      Yoga.OVERFLOW_VISIBLE
    )
  )

  node.setMargin(Yoga.EDGE_TOP, style.marginTop || 0)
  node.setMargin(Yoga.EDGE_BOTTOM, style.marginBottom || 0)
  node.setMargin(Yoga.EDGE_LEFT, style.marginLeft || 0)
  node.setMargin(Yoga.EDGE_RIGHT, style.marginRight || 0)

  node.setBorder(Yoga.EDGE_TOP, style.borderTopWidth || 0)
  node.setBorder(Yoga.EDGE_BOTTOM, style.borderBottomWidth || 0)
  node.setBorder(Yoga.EDGE_LEFT, style.borderLeftWidth || 0)
  node.setBorder(Yoga.EDGE_RIGHT, style.borderRightWidth || 0)

  node.setPadding(Yoga.EDGE_TOP, style.paddingTop || 0)
  node.setPadding(Yoga.EDGE_BOTTOM, style.paddingBottom || 0)
  node.setPadding(Yoga.EDGE_LEFT, style.paddingLeft || 0)
  node.setPadding(Yoga.EDGE_RIGHT, style.paddingRight || 0)

  node.setPositionType(
    (style.position,
    {
      absolute: Yoga.POSITION_TYPE_ABSOLUTE,
      relative: Yoga.POSITION_TYPE_RELATIVE,
    },
    Yoga.POSITION_TYPE_RELATIVE)
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

  return style
}
