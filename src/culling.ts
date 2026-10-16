/**
 * What's entirely outside of the image isn't drawn, which makes the SVGs of
 * long content, e.g. pages rendered at the size of a viewport, much smaller.
 * Descendants of transformed elements are always drawn, as they can be drawn
 * elsewhere than their boxes, and descendants of filtered elements are checked
 * with how far the filters draw outside of them.
 */

import type { SerializedStyle } from './handler/expand.js'
import type { BackdropFilter, URLFilter } from './parser/backdrop-filter.js'

/** The size of the image, known once the layout is. */
export interface PaintBounds {
  width: number
  height: number
}

/**
 * Whether a box, grown by `margin` on each side, is entirely outside of the
 * image. Anti-aliasing can draw next to the edges of shapes, so boxes that
 * touch the image are drawn.
 */
export function isOutside(
  bounds: PaintBounds,
  left: number,
  top: number,
  width: number,
  height: number,
  margin = 0
): boolean {
  const grow = margin + 1
  return (
    left + width + grow <= 0 ||
    top + height + grow <= 0 ||
    left - grow >= bounds.width ||
    top - grow >= bounds.height
  )
}

interface BoxShadow {
  offsetX?: number
  offsetY?: number
  blurRadius?: number
  spreadRadius?: number
  inset?: boolean
}

/**
 * How far outside of its box the box shadows of an element are drawn, at
 * most, which includes the region of the filters that draw them.
 */
export function getBoxShadowExtent(style: SerializedStyle): number {
  const shadows = style.boxShadow as unknown as BoxShadow[] | undefined
  let extent = 0
  for (const shadow of shadows || []) {
    if (shadow.inset) continue
    const blur = shadow.blurRadius || 0
    extent = Math.max(
      extent,
      Math.abs(shadow.offsetX || 0) +
        Math.abs(shadow.offsetY || 0) +
        Math.abs(shadow.spreadRadius || 0) +
        blur * 3 +
        (blur * blur) / 4
    )
  }
  return extent
}

/**
 * How far filters draw outside of what they filter, at most. Filters are
 * applied one after the other, so their extents add up. Filters of colors
 * draw in place.
 */
export function getFilterExtent(
  filters: (BackdropFilter | URLFilter)[] | undefined
) {
  let extent = 0
  for (const filter of filters || []) {
    // SVG filters can draw anywhere, e.g. with `<feOffset>`.
    if (filter.type === 'url') return Infinity
    if (filter.type === 'blur') {
      extent += filter.value * 3
    } else if (filter.type === 'drop-shadow') {
      extent +=
        filter.blurRadius * 3 +
        Math.abs(filter.offsetX) +
        Math.abs(filter.offsetY)
    }
  }
  return extent
}

/** How far outside of its box the outline of an element is drawn. */
export function getOutlineExtent(style: SerializedStyle): number {
  if (!style.outlineStyle || style.outlineStyle === 'none') return 0
  const width = typeof style.outlineWidth === 'number' ? style.outlineWidth : 3
  const offset =
    typeof style.outlineOffset === 'number'
      ? Math.max(style.outlineOffset, 0)
      : 0
  return width + offset
}
