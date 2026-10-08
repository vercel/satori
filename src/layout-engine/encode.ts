/**
 * Encodes a layout tree for `crates/layout/src/lib.rs`, which must be kept in
 * sync with this file.
 *
 * The buffer starts with the node count, followed by each node: its style
 * (see `encodeStyle`), whether it's measured, its child count and the indices
 * of its children. The root is the first node.
 */

import type {
  CalcLength,
  GridLine,
  GridTrackBreadth,
  GridTrackList,
  GridTrackSize,
  Length,
  LayoutNode,
  LayoutStyle,
} from './node.js'

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

const FLOAT = { none: 0, left: 1, right: 2 }

const CLEAR = { none: 0, left: 1, right: 2, both: 3 }

/**
 * Unit codes: 0 is auto, 1 is a length, 2 is a percentage, 3 is a `calc()`
 * expression, by its index in `calcs`.
 */
function pushLength(
  data: number[],
  length: Length | undefined,
  fallback: Length,
  scale: number,
  calcs: CalcLength['calc'][]
) {
  const value = length ?? fallback
  if (typeof value === 'number') {
    data.push(1, value * scale)
  } else if (typeof value === 'object') {
    data.push(3, calcs.push(value.calc) - 1)
  } else if (value.endsWith('%')) {
    data.push(2, parseFloat(value) / 100)
  } else {
    data.push(0, 0)
  }
}

function pushAlignment(data: number[], alignment: string | undefined) {
  data.push(alignment === undefined ? -1 : ALIGNMENT[alignment] ?? -1)
}

function encodeStyle(
  data: number[],
  style: LayoutStyle,
  scale: number,
  calcs: CalcLength['calc'][]
) {
  const length = (value: Length | undefined, fallback: Length) =>
    pushLength(data, value, fallback, scale, calcs)

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
  data.push(FLOAT[style.float] ?? 0, CLEAR[style.clear] ?? 0)
  encodeGridStyle(data, style, scale)
}

/** A length, then UTF-16 code units. */
function pushString(data: number[], string: string) {
  data.push(string.length)
  for (let i = 0; i < string.length; i++) data.push(string.charCodeAt(i))
}

/** A count, then each set: a count, then each name. */
function pushLineNames(data: number[], lineNames: string[][]) {
  data.push(lineNames.length)
  for (const names of lineNames) {
    data.push(names.length)
    for (const name of names) pushString(data, name)
  }
}

/**
 * Kinds: 0 is auto, 1 a length, 2 a percentage, 3 min-content, 4
 * max-content, 5 a flex fraction, 6 `fit-content()` with a length and 7 with
 * a percentage.
 */
function pushTrackBreadth(
  data: number[],
  breadth: GridTrackBreadth,
  scale: number
) {
  if (typeof breadth === 'number') {
    data.push(1, breadth * scale)
  } else if (typeof breadth === 'object') {
    const limit = breadth.fitContent
    if (typeof limit === 'number') data.push(6, limit * scale)
    else data.push(7, parseFloat(limit) / 100)
  } else if (breadth.endsWith('%')) {
    data.push(2, parseFloat(breadth) / 100)
  } else if (breadth.endsWith('fr')) {
    data.push(5, parseFloat(breadth))
  } else {
    data.push(
      breadth === 'min-content' ? 3 : breadth === 'max-content' ? 4 : 0,
      0
    )
  }
}

function pushTrackSizes(
  data: number[],
  tracks: GridTrackSize[],
  scale: number
) {
  data.push(tracks.length)
  for (const { min, max } of tracks) {
    pushTrackBreadth(data, min, scale)
    pushTrackBreadth(data, max, scale)
  }
}

/**
 * A count, then each track: 0 and its size, or 1 for `repeat()` followed by
 * its count (0 and the number, 1 for `auto-fill`, 2 for `auto-fit`), track
 * sizes and line names. Then the line names.
 */
function pushTrackList(
  data: number[],
  list: GridTrackList | undefined,
  scale: number
) {
  const tracks = list?.tracks ?? []
  data.push(tracks.length)
  for (const track of tracks) {
    if ('count' in track) {
      data.push(1)
      if (typeof track.count === 'number') data.push(0, track.count)
      else data.push(track.count === 'auto-fill' ? 1 : 2, 0)
      pushTrackSizes(data, track.tracks, scale)
      pushLineNames(data, track.lineNames)
    } else {
      data.push(0)
      pushTrackSizes(data, [track], scale)
    }
  }
  pushLineNames(data, list?.lineNames ?? [])
}

/**
 * Kinds: 0 is auto, 1 a line, 2 a span, 3 a named line and 4 a span to a
 * named line. Followed by the number and the name.
 */
function pushGridLine(data: number[], line: GridLine | undefined) {
  if (!line || line === 'auto') {
    data.push(0, 0, 0)
  } else if ('line' in line) {
    data.push(line.name ? 3 : 1, line.line)
    pushString(data, line.name ?? '')
  } else {
    data.push(line.name ? 4 : 2, line.span)
    pushString(data, line.name ?? '')
  }
}

const GRID_AUTO_FLOW = {
  row: 0,
  column: 1,
  'row dense': 2,
  'column dense': 3,
}

/**
 * Whether it's a grid container, then its properties. Whether it's placed
 * in a grid, then its lines: row start, row end, column start and end.
 */
function encodeGridStyle(data: number[], style: LayoutStyle, scale: number) {
  if (style.display === 'grid') {
    data.push(1)
    pushTrackList(data, style.gridTemplateColumns, scale)
    pushTrackList(data, style.gridTemplateRows, scale)
    pushTrackSizes(data, style.gridAutoColumns ?? [], scale)
    pushTrackSizes(data, style.gridAutoRows ?? [], scale)
    data.push(GRID_AUTO_FLOW[style.gridAutoFlow] ?? 0)
    // The row and column counts, then each area: its name and lines.
    const areas = style.gridTemplateAreas
    data.push(areas?.rowCount ?? 0, areas?.columnCount ?? 0)
    data.push(areas?.areas.length ?? 0)
    for (const area of areas?.areas ?? []) {
      pushString(data, area.name)
      data.push(area.rowStart, area.rowEnd, area.columnStart, area.columnEnd)
    }
  } else {
    data.push(0)
  }

  const lines = [
    style.gridRowStart,
    style.gridRowEnd,
    style.gridColumnStart,
    style.gridColumnEnd,
  ]
  if (lines.some((line) => line && line !== 'auto')) {
    data.push(1)
    for (const line of lines) pushGridLine(data, line)
  } else {
    data.push(0)
  }
}

export interface EncodedTree {
  data: Float32Array
  /** Nodes by their index in the buffer. */
  nodes: LayoutNode[]
  /** The indices of the children laid out in each node. */
  childIndices: number[][]
  /** `display: contents` nodes, which aren't laid out. */
  contents: LayoutNode[]
  /** The `calc()` expressions, by the index in the buffer. */
  calcs: CalcLength['calc'][]
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
    const children = collectChildren(node, [])
    // Flex and grid items are laid out in `order`, then in tree order.
    if (
      (node.style.display === 'flex' || node.style.display === 'grid') &&
      children.some((child) => child.style.order)
    ) {
      children.sort((a, b) => (a.style.order || 0) - (b.style.order || 0))
    }
    for (const child of children) {
      childIndices[index].push(visit(child))
    }
    return index
  }
  visit(root)

  const data: number[] = [nodes.length]
  const calcs: CalcLength['calc'][] = []
  nodes.forEach((node, index) => {
    encodeStyle(data, node.style, scale, calcs)
    data.push(node.measure ? 1 : 0, childIndices[index].length)
    data.push(...childIndices[index])
  })

  return {
    data: Float32Array.from(data),
    nodes,
    childIndices,
    contents,
    calcs,
  }
}
