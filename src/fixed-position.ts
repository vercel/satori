/**
 * Support for `position: fixed`. A fixed element is positioned and sized
 * relative to the viewport, unless an ancestor establishes a containing block
 * for it, e.g. with a `transform`:
 * https://drafts.csswg.org/css-position/#fixed-positioning-containing-block
 *
 * The layout engine positions an absolute node relative to its parent, so the
 * node of a fixed element is moved into the node of its containing block.
 */

import { LayoutNode } from './layout-engine/index.js'

export interface FixedContainingBlock {
  node: LayoutNode
  /** Where the containing block is drawn, set once it's laid out. */
  offset: { left: number; top: number }
  /**
   * The clip path and mask of fixed descendants. `clip-path` and `mask-image`
   * apply to all descendants, but `overflow: hidden` doesn't clip descendants
   * whose containing block is an ancestor of the element.
   */
  clipPathId?: string
  maskId?: string
}

export interface FixedElement {
  node: LayoutNode
  containingBlock: FixedContainingBlock
  /**
   * On an axis without insets, the element stays at its static position:
   * where it would be as an absolute child of its parent. The placeholder is a
   * node in the parent with the element's margins, alignment and size.
   */
  placeholder?: LayoutNode
  staticX: boolean
  staticY: boolean
}

/**
 * Insert the node of a fixed element into the node of its containing block.
 * Returns `undefined` without inserting it if it can be laid out like an
 * absolute element in its parent instead: when the parent is the containing
 * block, or when there is none because an ancestor isn't displayed.
 */
export function insertFixedNode(
  node: LayoutNode,
  parent: LayoutNode,
  containingBlock: FixedContainingBlock | undefined,
  fixedElements: FixedElement[]
): FixedElement | undefined {
  if (!containingBlock || containingBlock.node === parent) return

  const container = containingBlock.node
  container.insertChild(node)

  const { left, right, top, bottom } = node.style
  const staticX = left === undefined && right === undefined
  const staticY = top === undefined && bottom === undefined

  let placeholder: LayoutNode | undefined
  if (staticX || staticY) {
    placeholder = new LayoutNode({
      position: 'absolute',
      alignSelf: node.style.alignSelf,
    })
    parent.insertChild(placeholder)
  }

  const element = { node, containingBlock, placeholder, staticX, staticY }
  fixedElements.push(element)
  return element
}

/**
 * Give the static position placeholders the size and margins of their
 * element, once the elements are laid out. Returns whether the layout needs to
 * be calculated again.
 */
export function sizeStaticPositionPlaceholders(
  fixedElements: FixedElement[]
): boolean {
  let resized = false
  for (const { node, placeholder } of fixedElements) {
    if (!placeholder) continue
    const { width, height, margin } = node.layout
    // Percentages resolve against the containing block, not the parent.
    Object.assign(placeholder.style, {
      width,
      height,
      marginTop: margin.top,
      marginRight: margin.right,
      marginBottom: margin.bottom,
      marginLeft: margin.left,
    })
    resized = true
  }
  return resized
}

/**
 * Where the fixed element is drawn, given where its parent is drawn.
 */
export function getFixedElementPosition(
  {
    node,
    containingBlock: { offset },
    placeholder,
    staticX,
    staticY,
  }: FixedElement,
  parentLeft: number,
  parentTop: number
): [left: number, top: number] {
  return [
    staticX
      ? parentLeft + placeholder.layout.left
      : offset.left + node.layout.left,
    staticY ? parentTop + placeholder.layout.top : offset.top + node.layout.top,
  ]
}
