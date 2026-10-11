import type { Edges } from './layout-engine/node.js'
import type { SerializedStyle } from './handler/expand.js'
import type { PositionedBox } from './layout.js'

/** Resolves an inset of a sticky element, `undefined` if it's `auto`. */
function resolveInset(value: unknown, base: number): number | undefined {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.endsWith('%')) {
    return (parseFloat(value) / 100) * base
  }
  if (value && typeof value === 'object' && 'calc' in value) {
    return (value as { calc: (base: number) => number }).calc(base)
  }
}

/** The content box of a positioned box. */
function innerBox({ node, offset }: PositionedBox) {
  const { width, height, border, padding } = node.layout
  const inset = (edge: keyof Edges) => border[edge] + padding[edge]
  return {
    left: offset.left + inset('left'),
    top: offset.top + inset('top'),
    right: offset.left + width - inset('right'),
    bottom: offset.top + height - inset('bottom'),
  }
}

/**
 * Moves a sticky element along one axis, into its sticky view rectangle
 * without leaving its containing block. The start inset wins.
 */
function stickAxis(
  start: number,
  end: number,
  marginStart: number,
  marginEnd: number,
  view: [start: number | undefined, end: number | undefined],
  containingBlock: [start: number, end: number]
) {
  let offset = 0
  if (view[1] !== undefined && end > view[1]) {
    offset = -Math.min(
      end - view[1],
      Math.max(0, start - marginStart - containingBlock[0])
    )
  }
  if (view[0] !== undefined && start + offset < view[0]) {
    offset = Math.max(
      0,
      Math.min(view[0] - start, containingBlock[1] - end - marginEnd)
    )
  }
  return offset
}

/**
 * The offset of a sticky element. Without scrolling, it's moved into the
 * content box of its nearest scroll container, inset by its `top`, `right`,
 * `bottom` and `left`, and kept in its containing block.
 *
 * @see https://www.w3.org/TR/css-position-3/#stickypos-insets
 */
export function getStickyOffset(
  box: {
    left: number
    top: number
    width: number
    height: number
    margin: Edges
  },
  style: SerializedStyle,
  parent: PositionedBox,
  scrollport: PositionedBox
): [dx: number, dy: number] {
  // Like in browsers, the padding of the scroll container is excluded.
  const port = innerBox(scrollport)
  const containingBlock = innerBox(parent)
  const portWidth = port.right - port.left
  const portHeight = port.bottom - port.top
  const top = resolveInset(style.top, portHeight)
  const bottom = resolveInset(style.bottom, portHeight)
  const left = resolveInset(style.left, portWidth)
  const right = resolveInset(style.right, portWidth)
  const dx = stickAxis(
    box.left,
    box.left + box.width,
    box.margin.left,
    box.margin.right,
    [
      left === undefined ? undefined : port.left + left,
      right === undefined ? undefined : port.right - right,
    ],
    [containingBlock.left, containingBlock.right]
  )
  const dy = stickAxis(
    box.top,
    box.top + box.height,
    box.margin.top,
    box.margin.bottom,
    [
      top === undefined ? undefined : port.top + top,
      bottom === undefined ? undefined : port.bottom - bottom,
    ],
    [containingBlock.top, containingBlock.bottom]
  )
  return [dx, dy]
}
