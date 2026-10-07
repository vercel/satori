/**
 * Encodes a layout tree for `crates/layout/src/lib.rs`, which must be kept in
 * sync with this file.
 *
 * The buffer starts with the node count, followed by each node: its style
 * (see `encodeStyle`), whether it's measured, its child count and the indices
 * of its children. The root is the first node.
 */

import type { Length, LayoutNode, LayoutStyle } from './node.js'

const DISPLAY = {
  none: 0,
  flex: 1,
  block: 2,
  grid: 3,
  'flow-root': 4,
}

const ALIGNMENT = {
  start: 0,
  end: 1,
  'flex-start': 2,
  'flex-end': 3,
  center: 4,
  baseline: 5,
  stretch: 6,
  'space-between': 7,
  'space-evenly': 8,
  'space-around': 9,
}

const FLEX_DIRECTION = {
  row: 0,
  column: 1,
  'row-reverse': 2,
  'column-reverse': 3,
}

const FLEX_WRAP = { nowrap: 0, wrap: 1, 'wrap-reverse': 2 }

const OVERFLOW = { visible: 0, hidden: 1, clip: 2 }

/** Unit codes: 0 is auto, 1 is a length, 2 is a percentage. */
function pushLength(
  data: number[],
  length: Length | undefined,
  fallback: Length,
  scale: number
) {
  const value = length ?? fallback
  if (typeof value === 'number') {
    data.push(1, value * scale)
  } else if (value.endsWith('%')) {
    data.push(2, parseFloat(value) / 100)
  } else {
    data.push(0, 0)
  }
}

function pushAlignment(data: number[], alignment: string | undefined) {
  data.push(alignment === undefined ? -1 : ALIGNMENT[alignment] ?? -1)
}

function encodeStyle(data: number[], style: LayoutStyle, scale: number) {
  const length = (value: Length | undefined, fallback: Length) =>
    pushLength(data, value, fallback, scale)

  data.push(
    DISPLAY[style.display] ?? DISPLAY.flex,
    style.position === 'absolute' ? 1 : 0,
    style.boxSizing === 'content-box' ? 1 : 0,
    OVERFLOW[style.overflow] ?? 0,
    OVERFLOW[style.overflow] ?? 0
  )
  length(style.width, 'auto')
  length(style.height, 'auto')
  length(style.minWidth, 'auto')
  length(style.minHeight, 'auto')
  length(style.maxWidth, 'auto')
  length(style.maxHeight, 'auto')
  data.push(style.aspectRatio ?? NaN)
  for (const edge of ['Left', 'Right', 'Top', 'Bottom'] as const) {
    length(style[`margin${edge}`], 0)
  }
  for (const edge of ['Left', 'Right', 'Top', 'Bottom'] as const) {
    length(style[`padding${edge}`], 0)
  }
  for (const edge of ['Left', 'Right', 'Top', 'Bottom'] as const) {
    length(style[`border${edge}Width`], 0)
  }
  for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
    length(style[edge], 'auto')
  }
  length(style.columnGap, 0)
  length(style.rowGap, 0)
  pushAlignment(data, style.alignItems)
  pushAlignment(data, style.alignSelf)
  pushAlignment(data, style.alignContent)
  pushAlignment(data, style.justifyItems)
  pushAlignment(data, style.justifySelf)
  pushAlignment(data, style.justifyContent)
  data.push(
    FLEX_DIRECTION[style.flexDirection] ?? 0,
    FLEX_WRAP[style.flexWrap] ?? 0
  )
  length(style.flexBasis, 'auto')
  data.push(style.flexGrow ?? 0, style.flexShrink ?? 1)
  // `text-align` for block layout, which Satori doesn't use.
  data.push(0, style.replaced ? 1 : 0)
}

export interface EncodedTree {
  data: Float32Array
  /** Nodes by their index in the buffer. */
  nodes: LayoutNode[]
  /** The indices of the children laid out in each node. */
  childIndices: number[][]
  /** `display: contents` nodes, which aren't laid out. */
  contents: LayoutNode[]
}

/**
 * `scale` multiplies lengths, which makes rounding to whole pixels round to
 * fractions of pixels instead.
 */
export function encodeTree(root: LayoutNode, scale: number): EncodedTree {
  const nodes: LayoutNode[] = []
  const contents: LayoutNode[] = []
  const childIndices: number[][] = []

  // The children of a `display: contents` node are laid out as children of
  // its parent.
  const collectChildren = (node: LayoutNode, into: LayoutNode[]) => {
    for (const child of node.children) {
      if (child.style.display === 'contents') {
        contents.push(child)
        collectChildren(child, into)
      } else {
        into.push(child)
      }
    }
    return into
  }

  const visit = (node: LayoutNode) => {
    const index = nodes.length
    nodes.push(node)
    childIndices.push([])
    for (const child of collectChildren(node, [])) {
      childIndices[index].push(visit(child))
    }
    return index
  }
  visit(root)

  const data: number[] = [nodes.length]
  nodes.forEach((node, index) => {
    encodeStyle(data, node.style, scale)
    data.push(node.measure ? 1 : 0, childIndices[index].length)
    data.push(...childIndices[index])
  })

  return { data: Float32Array.from(data), nodes, childIndices, contents }
}
