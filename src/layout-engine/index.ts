/**
 * Lays out the layout tree with Taffy, compiled to WebAssembly from
 * `crates/layout`. https://github.com/DioxusLabs/taffy
 */

import * as bindings from '../../crates/layout/pkg/layout.js'
import { encodeTree } from './encode.js'
import {
  emptyLayout,
  type CalcLength,
  type Edges,
  type FloatExclusion,
  type LayoutNode,
} from './node.js'

export * from './node.js'

/** The number of `f32`s returned for each node, see `crates/layout`. */
const OUTPUT_STRIDE = 16

export interface ComputeLayoutOptions {
  /**
   * The available size, `undefined` to size to the content, or
   * `min-content` to its min-content width.
   */
  width?: number | 'min-content'
  height?: number
  /**
   * Layouts are rounded to multiples of `1 / pointScaleFactor` px, or not
   * rounded with 0. Defaults to 1.
   */
  pointScaleFactor?: number
}

export interface LayoutEngine {
  /** Lays out the tree, setting the `layout` of every node. */
  computeLayout(root: LayoutNode, options?: ComputeLayoutOptions): void
  parseCSS: typeof bindings.parseCss
  decodeWoff2: typeof bindings.decodeWoff2
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

/**
 * The layout engine. The bindings in `crates/layout/pkg` must be initialized
 * first, see `wasm.bundled.ts` and `wasm.external.ts`.
 */
export function createLayoutEngine(): LayoutEngine {
  // The tree being laid out, for `measure`.
  let nodes: LayoutNode[] = []
  let calcs: CalcLength['calc'][] = []
  let scale = 1

  const callbacks: bindings.LayoutCallbacks = {
    resolveCalc(index, basis) {
      return calcs[index](basis / scale) * scale
    },
    measure(
      index,
      knownWidth,
      knownHeight,
      availableWidth,
      availableHeight,
      values
    ) {
      // `values` is a view of the memory of the module, which measuring may
      // grow, so it's read first.
      const exclusions: FloatExclusion[] = []
      for (let i = 0; i < values.length; i += 4) {
        exclusions.push({
          top: values[i] / scale,
          bottom: values[i + 1] / scale,
          left: values[i + 2] / scale,
          right: values[i + 3] / scale,
        })
      }
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
      const result = nodes[index].measure(
        width / scale,
        height / scale,
        exclusions,
        Number.isNaN(knownWidth) && availableWidth < 0
      )
      return [
        result.width * scale,
        result.height * scale,
        (result.firstBaseline ?? NaN) * scale,
        (result.lastBaseline ?? NaN) * scale,
      ]
    },
  }

  return {
    computeLayout(root, { width, height, pointScaleFactor = 1 } = {}) {
      // Measuring a node may lay out another tree, e.g. an atomic inline, so
      // restore the tree being laid out afterwards.
      const outerNodes = nodes
      const outerCalcs = calcs
      const outerScale = scale
      const layoutScale = pointScaleFactor || 1
      scale = layoutScale
      const encoded = encodeTree(root, layoutScale)
      nodes = encoded.nodes
      calcs = encoded.calcs

      let result: Float32Array
      try {
        // Layouts are rounded below, so that measured leaves can be rounded
        // up instead.
        result = bindings.compute(
          encoded.data,
          width === undefined
            ? Infinity
            : width === 'min-content'
            ? -1
            : width * layoutScale,
          height === undefined ? Infinity : height * layoutScale,
          false,
          callbacks
        )
      } finally {
        nodes = outerNodes
        calcs = outerCalcs
        scale = outerScale
      }

      const edges = (offset: number): Edges => ({
        left: result[offset] / layoutScale,
        right: result[offset + 1] / layoutScale,
        top: result[offset + 2] / layoutScale,
        bottom: result[offset + 3] / layoutScale,
      })
      encoded.nodes.forEach((node, index) => {
        const offset = index * OUTPUT_STRIDE
        node.layout = {
          left: result[offset] / layoutScale,
          top: result[offset + 1] / layoutScale,
          width: result[offset + 2] / layoutScale,
          height: result[offset + 3] / layoutScale,
          padding: edges(offset + 4),
          border: edges(offset + 8),
          margin: edges(offset + 12),
        }
      })
      if (pointScaleFactor !== 0) {
        roundLayouts(encoded.nodes, encoded.childIndices, layoutScale)
      }
      // `display: contents` nodes have no box. Their children are positioned
      // relative to the parent, so they're at its origin.
      for (const node of encoded.contents) node.layout = emptyLayout()
    },
    parseCSS: bindings.parseCss,
    decodeWoff2: bindings.decodeWoff2,
  }
}
