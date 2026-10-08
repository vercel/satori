/**
 * Lays out the layout tree with Taffy, compiled to WebAssembly from
 * `crates/layout`. https://github.com/DioxusLabs/taffy
 */

import { encodeTree } from './encode.js'
import { emptyLayout, type Edges, type LayoutNode } from './node.js'

export * from './node.js'

/** The number of `f32`s returned for each node, see `crates/layout`. */
const OUTPUT_STRIDE = 16

interface LayoutExports {
  memory: WebAssembly.Memory
  alloc(len: number): number
  dealloc(ptr: number, len: number): void
  compute(
    ptr: number,
    len: number,
    availableWidth: number,
    availableHeight: number,
    useRounding: number
  ): number
}

export interface ComputeLayoutOptions {
  /** The available size, `undefined` to size to the content. */
  width?: number
  height?: number
  /**
   * Layouts are rounded to multiples of `1 / pointScaleFactor` px, or not
   * rounded with 0. Defaults to 1.
   */
  pointScaleFactor?: number
}

export interface LayoutEngine {
  imports: WebAssembly.Imports
  setInstance(instance: WebAssembly.Instance): void
  /** Lays out the tree, setting the `layout` of every node. */
  computeLayout(root: LayoutNode, options?: ComputeLayoutOptions): void
}

/**
 * Round boxes to multiples of `1 / scale` px. Edges are rounded in absolute
 * coordinates, so adjacent boxes stay adjacent. The size of measured leaves,
 * e.g. text, is rounded up, so that the text still fits.
 */
function roundLayouts(
  nodes: LayoutNode[],
  childIndices: number[][],
  scale: number
) {
  // Absorb floating point errors before rounding up.
  const round = (value: number) => Math.round(value * scale) / scale
  const ceil = (value: number) => Math.ceil(value * scale - 1e-3) / scale

  const visit = (
    index: number,
    parentLeft: number,
    parentTop: number,
    roundedParentLeft: number,
    roundedParentTop: number
  ) => {
    const node = nodes[index]
    const layout = node.layout
    const left = parentLeft + layout.left
    const top = parentTop + layout.top
    const roundedLeft = round(left)
    const roundedTop = round(top)
    const right = node.measure
      ? roundedLeft + ceil(layout.width)
      : round(left + layout.width)
    const bottom = node.measure
      ? roundedTop + ceil(layout.height)
      : round(top + layout.height)

    layout.left = roundedLeft - roundedParentLeft
    layout.top = roundedTop - roundedParentTop
    layout.width = right - roundedLeft
    layout.height = bottom - roundedTop

    for (const child of childIndices[index]) {
      visit(child, left, top, roundedLeft, roundedTop)
    }
  }
  visit(0, 0, 0, 0, 0)
}

export function createLayoutEngine(): LayoutEngine {
  let exports: LayoutExports | undefined
  // The tree being laid out, for `measure`.
  let nodes: LayoutNode[] = []
  let scale = 1

  const imports = {
    env: {
      measure(
        index: number,
        knownWidth: number,
        knownHeight: number,
        availableWidth: number,
        availableHeight: number,
        out: number
      ) {
        const width = Number.isNaN(knownWidth)
          ? availableWidth < 0
            ? 0
            : availableWidth
          : knownWidth
        const height = Number.isNaN(knownHeight)
          ? availableHeight < 0
            ? NaN
            : availableHeight
          : knownHeight
        const result = nodes[index].measure(width / scale, height / scale)
        // Measuring may have grown the memory, so create the view now.
        new Float32Array(exports.memory.buffer, out, 4).set([
          result.width * scale,
          result.height * scale,
          (result.firstBaseline ?? NaN) * scale,
          (result.lastBaseline ?? NaN) * scale,
        ])
      },
    },
  }

  return {
    imports,
    setInstance(instance) {
      exports = instance.exports as unknown as LayoutExports
    },
    computeLayout(root, { width, height, pointScaleFactor = 1 } = {}) {
      if (!exports) throw new Error('The layout engine is not initialized.')

      scale = pointScaleFactor || 1
      const encoded = encodeTree(root, scale)
      nodes = encoded.nodes

      const { data } = encoded
      const ptr = exports.alloc(data.length)
      let output: number
      try {
        new Float32Array(exports.memory.buffer, ptr, data.length).set(data)
        // Layouts are rounded below, so that measured leaves can be rounded
        // up instead.
        output = exports.compute(
          ptr,
          data.length,
          width === undefined ? Infinity : width * scale,
          height === undefined ? Infinity : height * scale,
          0
        )
      } finally {
        exports.dealloc(ptr, data.length)
        nodes = []
      }

      const result = new Float32Array(
        exports.memory.buffer,
        output,
        encoded.nodes.length * OUTPUT_STRIDE
      )
      const edges = (offset: number): Edges => ({
        left: result[offset] / scale,
        right: result[offset + 1] / scale,
        top: result[offset + 2] / scale,
        bottom: result[offset + 3] / scale,
      })
      encoded.nodes.forEach((node, index) => {
        const offset = index * OUTPUT_STRIDE
        node.layout = {
          left: result[offset] / scale,
          top: result[offset + 1] / scale,
          width: result[offset + 2] / scale,
          height: result[offset + 3] / scale,
          padding: edges(offset + 4),
          border: edges(offset + 8),
          margin: edges(offset + 12),
        }
      })
      if (pointScaleFactor !== 0) {
        roundLayouts(encoded.nodes, encoded.childIndices, scale)
      }
      // `display: contents` nodes have no box. Their children are positioned
      // relative to the parent, so they're at its origin.
      for (const node of encoded.contents) node.layout = emptyLayout()
    },
  }
}
