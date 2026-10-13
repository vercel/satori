/**
 * Lays out the layout tree with Taffy, compiled to WebAssembly from
 * `crates/layout`. https://github.com/DioxusLabs/taffy
 */

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
  alloc_bytes(len: number): number
  dealloc_bytes(ptr: number, len: number): void
  parse_css(ptr: number, len: number): number
  css_output(): number
  decode_woff2(ptr: number, len: number): number
  font_output(): number
  release_font_output(): void
}

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
  imports: WebAssembly.Imports
  setInstance(instance: WebAssembly.Instance): void
  /** Lays out the tree, setting the `layout` of every node. */
  computeLayout(root: LayoutNode, options?: ComputeLayoutOptions): void
  /**
   * Parses a stylesheet into JSON, see `crates/layout/src/css.rs` for the
   * format.
   */
  parseCSS(css: string): string
  /**
   * Decodes a WOFF2 font into a TrueType or OpenType font, or returns
   * `undefined` if it can't be decoded.
   */
  decodeWoff2(data: Uint8Array): ArrayBuffer | undefined
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
  let calcs: CalcLength['calc'][] = []
  let scale = 1

  const imports = {
    env: {
      resolve_calc(index: number, basis: number) {
        return calcs[index](basis / scale) * scale
      },
      measure(
        index: number,
        knownWidth: number,
        knownHeight: number,
        availableWidth: number,
        availableHeight: number,
        exclusionsPointer: number,
        exclusionCount: number,
        out: number
      ) {
        const values = new Float32Array(
          exports.memory.buffer,
          exclusionsPointer,
          exclusionCount * 4
        )
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
          width === undefined
            ? Infinity
            : width === 'min-content'
            ? -1
            : width * layoutScale,
          height === undefined ? Infinity : height * layoutScale,
          0
        )
      } finally {
        exports.dealloc(ptr, data.length)
        nodes = outerNodes
        calcs = outerCalcs
        scale = outerScale
      }

      const result = new Float32Array(
        exports.memory.buffer,
        output,
        encoded.nodes.length * OUTPUT_STRIDE
      )
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
    parseCSS(css) {
      if (!exports) throw new Error('The layout engine is not initialized.')

      const input = new TextEncoder().encode(css)
      const ptr = exports.alloc_bytes(input.length)
      let length: number
      try {
        new Uint8Array(exports.memory.buffer, ptr, input.length).set(input)
        length = exports.parse_css(ptr, input.length)
      } finally {
        exports.dealloc_bytes(ptr, input.length)
      }
      return new TextDecoder().decode(
        new Uint8Array(exports.memory.buffer, exports.css_output(), length)
      )
    },
    decodeWoff2(data) {
      if (!exports) throw new Error('The layout engine is not initialized.')

      const ptr = exports.alloc_bytes(data.length)
      let length: number
      try {
        new Uint8Array(exports.memory.buffer, ptr, data.length).set(data)
        length = exports.decode_woff2(ptr, data.length)
      } finally {
        exports.dealloc_bytes(ptr, data.length)
      }
      if (!length) return
      // Copied out of the memory of the module, which is then freed.
      const font = new Uint8Array(length)
      font.set(
        new Uint8Array(exports.memory.buffer, exports.font_output(), length)
      )
      exports.release_font_output()
      return font.buffer
    },
  }
}
