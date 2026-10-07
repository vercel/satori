/**
 * The layout tree. Satori builds it from the element tree, and Taffy lays it
 * out, see `index.ts`.
 */

/** A length in px, a percentage, or `auto`. */
export type Length = number | `${number}%` | 'auto'

export type Alignment =
  | 'start'
  | 'end'
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'baseline'
  | 'stretch'

export type ContentAlignment =
  | 'start'
  | 'end'
  | 'flex-start'
  | 'flex-end'
  | 'center'
  | 'stretch'
  | 'space-between'
  | 'space-evenly'
  | 'space-around'

export interface LayoutStyle {
  display?: 'flex' | 'block' | 'flow-root' | 'grid' | 'none' | 'contents'
  position?: 'relative' | 'absolute'
  boxSizing?: 'border-box' | 'content-box'
  overflow?: 'visible' | 'hidden' | 'clip'
  width?: Length
  height?: Length
  minWidth?: Length
  minHeight?: Length
  maxWidth?: Length
  maxHeight?: Length
  aspectRatio?: number
  marginTop?: Length
  marginRight?: Length
  marginBottom?: Length
  marginLeft?: Length
  paddingTop?: Length
  paddingRight?: Length
  paddingBottom?: Length
  paddingLeft?: Length
  borderTopWidth?: number
  borderRightWidth?: number
  borderBottomWidth?: number
  borderLeftWidth?: number
  top?: Length
  right?: Length
  bottom?: Length
  left?: Length
  rowGap?: Length
  columnGap?: Length
  alignItems?: Alignment
  alignSelf?: Alignment
  alignContent?: ContentAlignment
  justifyItems?: Alignment
  justifySelf?: Alignment
  justifyContent?: ContentAlignment
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse'
  flexBasis?: Length
  flexGrow?: number
  flexShrink?: number
  /** Replaced elements, e.g. images, are sized differently in block layout. */
  replaced?: boolean
}

export interface Edges {
  left: number
  right: number
  top: number
  bottom: number
}

export interface ComputedLayout {
  /** The position of the border box, relative to the parent's border box. */
  left: number
  top: number
  width: number
  height: number
  padding: Edges
  border: Edges
  margin: Edges
}

export interface MeasureResult {
  width: number
  height: number
  /** Distances of the first and last baselines from the top. */
  firstBaseline?: number
  lastBaseline?: number
}

/**
 * Measures a leaf, e.g. text. `width` is the known width, or the available
 * width: 0 for the min-content size and `Infinity` for the max-content size.
 * `height` is the known or available height, `NaN` if it's not known.
 */
export type MeasureFunction = (width: number, height: number) => MeasureResult

const zeroEdges = (): Edges => ({ left: 0, right: 0, top: 0, bottom: 0 })

export const emptyLayout = (): ComputedLayout => ({
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  padding: zeroEdges(),
  border: zeroEdges(),
  margin: zeroEdges(),
})

export class LayoutNode {
  style: LayoutStyle
  children: LayoutNode[] = []
  parent: LayoutNode | null = null
  /** Measures the node, which must not have children. */
  measure: MeasureFunction | null = null
  /** Set by `computeLayout`. */
  layout: ComputedLayout = emptyLayout()

  constructor(style: LayoutStyle = {}) {
    this.style = style
  }

  insertChild(child: LayoutNode, index = this.children.length) {
    child.parent?.removeChild(child)
    child.parent = this
    this.children.splice(index, 0, child)
  }

  removeChild(child: LayoutNode) {
    const index = this.children.indexOf(child)
    if (index !== -1) this.children.splice(index, 1)
    child.parent = null
  }

  /** The width of the content box. */
  get contentWidth() {
    const { width, padding, border } = this.layout
    return width - padding.left - padding.right - border.left - border.right
  }
}
