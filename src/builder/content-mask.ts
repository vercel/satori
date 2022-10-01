/**
 * When there is border radius, the content area should be clipped by the
 * inner path of border + padding. This applies to <img> element as well as any
 * child element inside a `overflow: hidden` container.
 */

import { buildXMLString } from '../utils'
import border from './border'

export default function contentMask(
  {
    id,
    left,
    top,
    width,
    height,
    matrix,
    borderOnly,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    matrix: string | undefined
    borderOnly?: boolean
  },
  style: Record<string, number | string>
) {
  const offsetLeft =
    ((style.borderLeftWidth as number) || 0) +
    (borderOnly ? 0 : (style.paddingLeft as number) || 0)
  const offsetTop =
    ((style.borderTopWidth as number) || 0) +
    (borderOnly ? 0 : (style.paddingTop as number) || 0)
  const offsetRight =
    ((style.borderRightWidth as number) || 0) +
    (borderOnly ? 0 : (style.paddingRight as number) || 0)
  const offsetBottom =
    ((style.borderBottomWidth as number) || 0) +
    (borderOnly ? 0 : (style.paddingBottom as number) || 0)

  const contentArea = {
    x: left + offsetLeft,
    y: top + offsetTop,
    width: width - offsetLeft - offsetRight,
    height: height - offsetTop - offsetBottom,
  }

  const contentMask = buildXMLString(
    'mask',
    { id },
    buildXMLString('rect', {
      ...contentArea,
      fill: '#fff',
      mask: style._inheritedMaskId
        ? `url(#${style._inheritedMaskId})`
        : undefined,
    }) +
      border(
        {
          left,
          top,
          width,
          height,
          props: {
            transform: matrix ? matrix : undefined,
          },
          asContentMask: true,
          maskBorderOnly: borderOnly,
        },
        style
      )
  )

  return contentMask
}
