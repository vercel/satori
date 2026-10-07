/**
 * Support for `position: fixed`. A fixed element is positioned and sized
 * relative to the viewport, unless an ancestor establishes a containing block
 * for it, e.g. with a `transform`:
 * https://drafts.csswg.org/css-position/#fixed-positioning-containing-block
 *
 * Yoga positions an absolute node relative to its parent, so the node of a
 * fixed element is moved into the node of its containing block.
 */

import type { TYoga, YogaNode } from './yoga.js'

export interface FixedContainingBlock {
  node: YogaNode
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
  node: YogaNode
  containingBlock: FixedContainingBlock
  /**
   * On an axis without insets, the element stays at its static position:
   * where it would be as an absolute child of its parent. The placeholder is a
   * node in the parent with the element's margins, alignment and size.
   */
  placeholder?: YogaNode
  staticX: boolean
  staticY: boolean
}

const EDGES = ['EDGE_TOP', 'EDGE_RIGHT', 'EDGE_BOTTOM', 'EDGE_LEFT'] as const

/**
 * Insert the node of a fixed element into the node of its containing block.
 * Returns `undefined` without inserting it if it can be laid out like an
 * absolute element in its parent instead: when the parent is the containing
 * block, or when there is none because an ancestor isn't displayed.
 */
export function insertFixedNode(
  Yoga: TYoga,
  node: YogaNode,
  parent: YogaNode,
  containingBlock: FixedContainingBlock | undefined,
  fixedElements: FixedElement[]
): FixedElement | undefined {
  if (!containingBlock || containingBlock.node === parent) return

  const container = containingBlock.node
  container.insertChild(node, container.getChildCount())

  const isAuto = (edge: number) =>
    node.getPosition(edge).unit === Yoga.UNIT_UNDEFINED
  const staticX = isAuto(Yoga.EDGE_LEFT) && isAuto(Yoga.EDGE_RIGHT)
  const staticY = isAuto(Yoga.EDGE_TOP) && isAuto(Yoga.EDGE_BOTTOM)

  let placeholder: YogaNode | undefined
  if (staticX || staticY) {
    placeholder = Yoga.Node.create()
    placeholder.setPositionType(Yoga.POSITION_TYPE_ABSOLUTE)
    placeholder.setAlignSelf(node.getAlignSelf())
    parent.insertChild(placeholder, parent.getChildCount())
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
  Yoga: TYoga,
  fixedElements: FixedElement[]
): boolean {
  let resized = false
  for (const { node, placeholder } of fixedElements) {
    if (!placeholder) continue
    placeholder.setWidth(node.getComputedWidth())
    placeholder.setHeight(node.getComputedHeight())
    // Percentages resolve against the containing block, not the parent.
    for (const edge of EDGES) {
      placeholder.setMargin(Yoga[edge], node.getComputedMargin(Yoga[edge]))
    }
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
      ? parentLeft + placeholder.getComputedLeft()
      : offset.left + node.getComputedLeft(),
    staticY
      ? parentTop + placeholder.getComputedTop()
      : offset.top + node.getComputedTop(),
  ]
}
