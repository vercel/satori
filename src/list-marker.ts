/**
 * Counters and the markers of list items.
 *
 * @see https://www.w3.org/TR/css-lists-3/
 */
import type { ReactElement } from 'react'

import type { CounterChange, SerializedStyle } from './handler/expand.js'
import presets from './handler/presets.js'
import { getMarkerText, SYMBOL_MARKERS } from './counter-styles.js'

interface CounterInstance {
  value: number
  /** The parent of the element that created it, which ends its scope. */
  scope: string
  reversed: boolean
}

/**
 * The counters in scope while elements are laid out in tree order. A counter
 * created by an element is in scope for its descendants, its following
 * siblings and their descendants.
 */
export class Counters {
  private stacks = new Map<string, CounterInstance[]>()

  private stack(name: string) {
    let stack = this.stacks.get(name)
    if (!stack) this.stacks.set(name, (stack = []))
    return stack
  }

  /** Ends the scope of the counters created by the children of an element. */
  closeScope(parent: string) {
    for (const stack of this.stacks.values()) {
      while (stack.length && stack[stack.length - 1].scope === parent) {
        stack.pop()
      }
    }
  }

  reset(name: string, value: number, scope: string, reversed = false) {
    const stack = this.stack(name)
    // It replaces a counter created by a preceding sibling.
    if (stack.length && stack[stack.length - 1].scope === scope) stack.pop()
    stack.push({ value, scope, reversed })
  }

  private innermost(name: string, scope: string) {
    const stack = this.stack(name)
    if (!stack.length) this.reset(name, 0, scope)
    return stack[stack.length - 1]
  }

  increment(name: string, by: number, scope: string) {
    this.innermost(name, scope).value += by
  }

  set(name: string, value: number, scope: string) {
    this.innermost(name, scope).value = value
  }

  isReversed(name: string) {
    const stack = this.stack(name)
    return !!stack[stack.length - 1]?.reversed
  }

  value(name: string) {
    const stack = this.stack(name)
    return stack[stack.length - 1]?.value ?? 0
  }
}

type Child = ReactElement | string

const isElement = (child: unknown): child is ReactElement =>
  !!child && typeof child === 'object' && 'type' in (child as object)

/** The `display` of an element from its style and preset. */
function getDisplay(element: ReactElement): string {
  const style = element.props?.style
  const display =
    style?.display ??
    (typeof element.type === 'string'
      ? presets[element.type]?.display
      : undefined)
  return String(display ?? 'inline').trim()
}

const parseList = (value: unknown) =>
  typeof value === 'string' ? value.trim().split(/\s+/) : []

/** How an element changes a counter, from its style and attributes. */
function getChanges(element: ReactElement, name: string) {
  const { style, value } = element.props || {}
  const increments = parseList(style?.counterIncrement)
  const sets = parseList(style?.counterSet)
  const resets = parseList(style?.counterReset)
  const amount = (tokens: string[], fallback: number) => {
    const index = tokens.findIndex(
      (token) => token === name || token === `reversed(${name})`
    )
    if (index === -1) return
    const next = parseInt(tokens[index + 1], 10)
    return Number.isNaN(next) ? fallback : next
  }
  let increment = amount(increments, 1)
  let set = amount(sets, 0)
  const isListItem = getDisplay(element) === 'list-item' && name === 'list-item'
  if (isListItem && increment === undefined) increment = -1
  if (
    isListItem &&
    set === undefined &&
    element.type === 'li' &&
    value !== undefined &&
    !Number.isNaN(parseInt(value, 10))
  ) {
    set = parseInt(value, 10)
  }
  const resetsCounter =
    amount(resets, 0) !== undefined ||
    (name === 'list-item' &&
      typeof element.type === 'string' &&
      ['ol', 'ul', 'menu', 'dir'].includes(element.type))
  return { increment, set, resetsCounter }
}

/**
 * The initial value of a `reversed()` counter without a value, from the
 * elements in its scope that change it: the number of list items in a
 * reversed list.
 *
 * @see https://www.w3.org/TR/css-lists-3/#instantiating-counters
 */
export function getReversedStart(children: Child[], name: string) {
  let num = 0
  let first = true
  let done = false
  const visit = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (done || !isElement(node)) continue
      if (getDisplay(node) === 'none') continue
      const { increment, set, resetsCounter } = getChanges(node, name)
      if (increment !== undefined || set !== undefined) {
        const negated = -(increment ?? 0)
        if (first) {
          num += negated
          first = false
        }
        if (set !== undefined) {
          num += set
          done = true
          return
        }
        num += negated
      }
      // Descendants of a nested counter are in its scope.
      if (!resetsCounter) visit([].concat(node.props?.children ?? []).flat())
    }
  }
  visit(children)
  return num
}

/** Applies `counter-reset`, `counter-increment` and `counter-set`, in order. */
export function applyCounters(
  counters: Counters,
  style: SerializedStyle,
  scope: string,
  children: Child[]
) {
  const resets = (style.counterReset as unknown as CounterChange[]) || []
  const increments =
    (style.counterIncrement as unknown as CounterChange[]) || []
  const sets = (style.counterSet as unknown as CounterChange[]) || []
  for (const { name, value, reversed } of resets) {
    counters.reset(
      name,
      value ?? (reversed ? getReversedStart(children, name) : 0),
      scope,
      reversed
    )
  }
  for (const { name, value } of increments) {
    counters.increment(name, value ?? 1, scope)
  }
  // List items increment `list-item`, unless it's incremented explicitly.
  if (style.__listItem && !increments.some((c) => c.name === 'list-item')) {
    counters.increment(
      'list-item',
      counters.isReversed('list-item') ? -1 : 1,
      scope
    )
  }
  for (const { name, value } of sets) {
    counters.set(name, value ?? 0, scope)
  }
}

const span = (
  style: Record<string, string | number>,
  children?: Child | Child[]
): ReactElement =>
  ({
    type: 'span',
    key: null,
    props: { style, children, __marker: true },
  } as unknown as ReactElement)

/** The styles of the marker that it inherits from its list item. */
function markerFont(style: SerializedStyle) {
  const font = {
    color: style.color,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    wordSpacing: style.wordSpacing,
    textTransform: 'none',
    textDecoration: 'none',
    whiteSpace: 'pre',
    // Like `font-variant-numeric: tabular-nums` of `::marker`.
    fontFeatureSettings: '"tnum"',
  } as Record<string, string | number>
  for (const key in font) if (font[key] === undefined) delete font[key]
  return font
}

/**
 * The spaces at the end of an inside marker. Like in browsers, the line can
 * break after them, as the `white-space` of the list item applies there.
 */
const trailingSpace = (font: Record<string, string | number>, spaces: string) =>
  span({ ...font, whiteSpace: 'pre-wrap' }, spaces)

/**
 * The elements of the marker of a list item, to be laid out at the start of
 * its first line. Outside markers take no space. `ascent` is the rounded
 * ascent of the list item's font.
 *
 * Symbols are drawn as shapes, sized and positioned like in Chrome.
 */
export function getListMarker(
  style: SerializedStyle,
  value: number,
  ascent: number
): ReactElement[] {
  const type = String(style.listStyleType ?? 'disc')
  const image = String(style.listStyleImage ?? 'none')
  const outside = style.listStylePosition !== 'inside'
  const font = markerFont(style)

  const url = /^url\((['"]?)(.*)\1\)$/is.exec(image.trim())
  if (url) {
    // Images sit on the baseline, 7px from the content.
    const img = {
      type: 'img',
      key: null,
      props: {
        src: url[2],
        style: outside ? { marginRight: 7, flexShrink: 0 } : { marginRight: 7 },
        __marker: true,
      },
    } as unknown as ReactElement
    return outside
      ? [
          span(
            {
              ...font,
              display: 'inline-flex',
              width: 0,
              justifyContent: 'flex-end',
              alignItems: 'baseline',
            },
            [img]
          ),
        ]
      : [img]
  }

  if (type === 'none') return []

  const name = type.toLowerCase()
  if (SYMBOL_MARKERS.has(name)) {
    const offset = Math.floor((ascent * 2) / 3)
    const disclosure = name.startsWith('disclosure')
    const size = disclosure
      ? (style.fontSize as number) * 0.66
      : Math.floor((offset + 1) / 2)
    const top = disclosure
      ? ascent - size
      : Math.floor((3 * (ascent - offset)) / 2)
    // Outside markers start before the content, and take no space.
    const left = outside ? (disclosure ? -(size + 8) : -(offset + 7)) : 0
    const shape: Record<string, string | number> = {
      display: 'inline-block',
      width: size,
      height: size,
      // Its baseline is the bottom of its margin box.
      marginBottom: ascent - top - size,
      marginLeft: left,
      marginRight: outside
        ? -left - size
        : disclosure
        ? '0.4em'
        : `calc(1.1em - ${size}px)`,
      backgroundColor: style.color,
    }
    if (name === 'disc') shape.borderRadius = '50%'
    if (name === 'circle') {
      // A 1px stroke centered on the edge of the circle.
      Object.assign(shape, {
        width: size + 1,
        height: size + 1,
        marginLeft: left - 0.5,
        marginBottom: ascent - top - size - 0.5,
        marginRight: outside
          ? -left - size - 0.5
          : `calc(1.1em - ${size + 0.5}px)`,
        backgroundColor: 'transparent',
        boxSizing: 'border-box',
        border: `1px solid ${style.color}`,
        borderRadius: '50%',
      })
    }
    if (name === 'disclosure-open') {
      shape.clipPath = 'polygon(0 0, 100% 0, 50% 86.6%)'
    } else if (name === 'disclosure-closed') {
      shape.clipPath = 'polygon(0 0, 86.6% 50%, 0 100%)'
    }
    // Inside disc, circle and square markers are followed by a space.
    return outside || disclosure
      ? [span({ ...font, ...shape })]
      : [span({ ...font, ...shape }), trailingSpace(font, ' ')]
  }

  const text = getMarkerText(value, type)
  if (!outside) {
    const [, content, spaces] = /^(.*?)(\s*)$/s.exec(text)
    return spaces
      ? [span(font, content), trailingSpace(font, spaces)]
      : [span(font, text)]
  }
  // The text ends at the start of the content.
  return [
    span(
      {
        ...font,
        display: 'inline-flex',
        width: 0,
        justifyContent: 'flex-end',
      },
      [span({ flexShrink: 0 }, text)]
    ),
  ]
}

/** Elements that pass markers to their first line, or their first item. */
const MARKER_CONTAINERS = new Set([
  'block',
  'list-item',
  'flow-root',
  'flex',
  'grid',
])

/**
 * Where the markers of an element go. In a block container, they go into its
 * first in-flow child if it's a block-level container, to be in its first
 * line, or before the first in-flow child. In a flex or grid container, they
 * go into its first item.
 */
export function findMarkerTarget(
  children: Child[],
  isItemContainer: boolean
): { index: number; nested: boolean; wrap?: boolean } {
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    if (typeof child === 'string') {
      if (!child.trim()) continue
      // Text in a flex or grid container is wrapped in an item with them.
      return { index, nested: false, wrap: isItemContainer }
    }
    if (!isElement(child)) continue
    const style = child.props?.style || {}
    const display = getDisplay(child)
    if (
      display === 'none' ||
      style.position === 'absolute' ||
      style.position === 'fixed' ||
      (style.float && style.float !== 'none')
    ) {
      continue
    }
    const replaced = child.type === 'img' || child.type === 'svg'
    return {
      index,
      nested:
        !replaced &&
        typeof child.type === 'string' &&
        (isItemContainer || MARKER_CONTAINERS.has(display)),
    }
  }
  return { index: children.length, nested: false }
}
