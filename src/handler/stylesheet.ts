/**
 * Applies the stylesheets of `<style>` elements. They're parsed by
 * `crates/layout/src/css.rs`, then the declarations of the rules that match
 * each element are merged with its inline style in cascade order, so that the
 * rest of Satori handles them like inline styles.
 */

import type { ReactElement, ReactNode } from 'react'

import type { LayoutEngine } from '../layout-engine/index.js'
import { isReactElement, normalizeChildren } from '../utils.js'
import { PLACEHOLDER_PROP } from '../form-control.js'

// The JSON from `crates/layout/src/css.rs`.
type Combinator = ' ' | '>' | '+' | '~'
type RawSimple = [string, ...any[]]
type RawComplex = (RawSimple[] | Combinator)[]
/** A part of `content`: text, or a function or keyword. */
type ContentPart = string | [kind: string, ...args: any[]]
type Declaration = [
  name: string,
  value: string | ContentPart[],
  important: 0 | 1
]
interface RawRule {
  s?: RawComplex[]
  m?: string
  u?: string
  c?: string
  l?: string[]
  p?: string
  b?: Item[]
}
type Item = RawRule | Declaration

type Simple = [string, ...any[]]
type Compound = Simple[]
interface Selector {
  parts: (Compound | Combinator)[]
  specificity: number
  /** The pseudo-element it selects, e.g. `before`. */
  pseudo?: string
}

interface Rule {
  selectors: Selector[]
  declarations: Declaration[]
  /** The position in the stylesheets. */
  order: number
  layer: string[]
  /** The precedence of the layer, see `rankLayers()`. */
  rank: number
  /** The conditions of the `@container` rules it's in. */
  containers?: ContainerCondition[]
}

/** A custom property registered with `@property`. */
interface RegisteredProperty {
  inherits: boolean
  initial?: string
}

/** The initial values of registered custom properties, see `cascade()`. */
interface InitialValues {
  all: [name: string, value: string][]
  notInherited: [name: string, value: string][]
}

/** What the styles of the rebuilt tree depend on, see `rebuild()`. */
interface RebuildContext {
  invalid: Set<Declaration>
  initial?: InitialValues
  /** For container units, see `resolveContainerUnits()`. */
  units?: { sizes?: Map<number, ContainerSize>; viewport: Viewport }
}

/** The condition of a `@container` rule, for the container with `name`. */
interface ContainerCondition {
  name?: string
  query: string
}

export interface Viewport {
  width?: number
  height?: number
}

/** The size of the content box of a query container. */
export interface ContainerSize {
  width: number
  height: number
}

/**
 * Container queries depend on the size of containers, which is known after
 * layout. Without `sizes`, they don't match, and `queried` is set when they
 * could, so that the tree is laid out again with the sizes of its containers.
 */
export interface ContainerQueries {
  /** The sizes of containers, by their `CONTAINER_PROP`. */
  sizes?: Map<number, ContainerSize>
  queried?: boolean
}

/** The prop of query containers, their index in tree order. */
export const CONTAINER_PROP = '__satoriContainer'

/** An element of the tree, for matching selectors. */
interface Node {
  type: string
  props: Record<string, any>
  parent: Node | null
  /** The elements with the same parent, including this one. */
  siblings: Node[]
  index: number
  children: Node[]
  /** Whether it has text, for `:empty`. */
  text: boolean
  classes: string[]
  lang?: string
  /** Whether it's in an `<svg>`. */
  svg: boolean
  /** Set if it's a query container, see `getContainer()`. */
  container?: Container
  /**
   * The rules that match it, and its `::before` and `::after` if it can have
   * them, see `matchRules()`.
   */
  matched?: Partial<
    Record<'' | 'before' | 'after' | 'placeholder', MatchedRule[]>
  >
  /** The custom properties it declares, see `cascade()`. */
  custom?: Set<string>
}

interface Container {
  index: number
  type: 'inline-size' | 'size'
  names: string[]
}

interface MatchedRule {
  rule: Rule
  /** The specificity of the most specific selector that matches. */
  specificity: number
}

// Specificities are compared as numbers.
const ID = 1 << 20
const CLASS = 1 << 10
const TYPE = 1

const LOGICAL_PSEUDO_CLASSES = new Set(['is', 'where', 'not', 'has'])
const PSEUDO_CLASSES = new Set([
  'root',
  'scope',
  'empty',
  'first-child',
  'last-child',
  'only-child',
  'first-of-type',
  'last-of-type',
  'only-of-type',
  'link',
  'any-link',
  '-webkit-any-link',
  'defined',
  'read-only',
  // These never match, since there are no shadow trees.
  'host',
  // These never match, since elements aren't interactive.
  'hover',
  'active',
  'focus',
  'focus-visible',
  'focus-within',
  'visited',
  'target',
  'target-within',
  'checked',
  'indeterminate',
  'default',
  'disabled',
  'enabled',
  'required',
  'optional',
  'valid',
  'invalid',
  'user-valid',
  'user-invalid',
  'in-range',
  'out-of-range',
  'read-write',
  'placeholder-shown',
  'autofill',
  '-webkit-autofill',
  'playing',
  'paused',
  'fullscreen',
  'modal',
  'popover-open',
  'open',
  'closed',
])

/**
 * Functional pseudo-classes of shadow trees and custom elements, which never
 * match. Browsers accept them, so rules with them aren't dropped.
 */
const NEVER_MATCHING_FUNCTIONS = new Set(['host', 'host-context', 'state'])

/** How the declarations of stylesheets are validated. */
export interface Validation {
  /** The error of a declaration, if its value is invalid or unsupported. */
  getError: (name: string, value: string) => Promise<Error | undefined>
  /** Reports the errors of declarations that are dropped. */
  onError?: (error: Error) => void
}

/**
 * Applies the stylesheets in the tree, which has no components, see
 * `resolveComponents()`. Without stylesheets, the tree is returned as is.
 */
export async function applyStyleSheets(
  root: ReactNode,
  engine: LayoutEngine,
  viewport: Viewport,
  validation?: Validation,
  containers?: ContainerQueries
): Promise<ReactNode> {
  const sheets: string[] = []
  collectStyleSheets(root, sheets, viewport)
  if (!sheets.length) return root

  const parsed: Item[][] = sheets.map((css) => JSON.parse(engine.parseCSS(css)))
  const state: CompileState = {
    order: 0,
    anonymousLayers: 0,
    layers: new Map(),
    viewport,
    properties: new Map(),
    // Feature queries aren't errors, so they're not reported.
    supported:
      validation &&
      (await checkSupportsDeclarations(parsed, validation.getError)),
  }
  const rules: Rule[] = []
  for (const items of parsed) compileRules(items, null, [], rules, state)
  rankLayers(rules, state.layers)
  const initial = getInitialValues(state.properties)
  if (!rules.length && !initial) return root

  const roots: Node[] = []
  buildNodes(root, null, roots)
  // Rules are matched first, so that only the declarations that apply are
  // validated.
  const nodes: Node[] = []
  const sizes = containers?.sizes
  let containerCount = 0
  const visit = (node: Node) => {
    node.matched = { '': matchRules(node, rules, sizes) }
    // Containers are known before their descendants are matched, and before
    // their own pseudo-elements, which can query them.
    if ((state.containerRules || state.containerUnits) && !node.svg) {
      node.container = getContainer(node, containerCount)
      if (node.container) containerCount++
    }
    if (!node.svg && !NO_GENERATED_CONTENT.has(node.type)) {
      node.matched.before = matchRules(node, rules, sizes, 'before')
      node.matched.after = matchRules(node, rules, sizes, 'after')
    }
    if (node.type === 'input' && !node.svg) {
      node.matched.placeholder = matchRules(node, rules, sizes, 'placeholder')
    }
    nodes.push(node)
    node.children.forEach(visit)
  }
  roots.forEach(visit)
  if (containers) containers.queried = containerCount > 0
  const invalid = validation
    ? await findInvalidDeclarations(nodes, validation)
    : new Set<Declaration>()

  const children = rebuild(root, roots, {
    invalid,
    initial,
    units: state.containerUnits ? { sizes, viewport } : undefined,
  })
  return isFragment(root)
    ? {
        ...(root as ReactElement),
        props: { ...(root as ReactElement).props, children },
      }
    : children[0] ?? root
}

function isFragment(node: ReactNode) {
  return (
    isReactElement(node) &&
    (node as ReactElement).type === (Symbol.for('react.fragment') as any)
  )
}

function textContent(children: ReactNode) {
  return normalizeChildren(children)
    .filter((child) => typeof child === 'string')
    .join('')
}

/**
 * Collects the text of `<style>` elements in tree order. Stylesheets inside
 * `<svg>` are drawn with it.
 */
function collectStyleSheets(
  node: ReactNode,
  sheets: string[],
  viewport: Viewport
) {
  for (const child of normalizeChildren(node)) {
    if (!isReactElement(child) || typeof child.type !== 'string') continue
    const props = child.props || {}
    if (child.type === 'style') {
      if (props.media === undefined || matchesMedia(props.media, viewport)) {
        sheets.push(textContent(props.children))
      }
    } else if (child.type !== 'svg') {
      collectStyleSheets(props.children, sheets, viewport)
    }
  }
}

interface CompileState {
  order: number
  anonymousLayers: number
  /** The layers in the order they're declared, by name. */
  layers: Map<string, number>
  viewport: Viewport
  /** Whether the declarations of `@supports` are supported. */
  supported?: Map<string, boolean>
  /** Whether there are rules in `@container`. */
  containerRules?: boolean
  /** Whether declarations have container units, e.g. `cqw`. */
  containerUnits?: boolean
  /** The custom properties registered with `@property`, by name. */
  properties: Map<string, RegisteredProperty>
}

/**
 * Compiles parsed rules into a flat list. In style rules, declarations after
 * nested rules come after them, with the same selectors.
 */
function compileRules(
  items: Item[],
  parent: Selector[] | null,
  layer: string[],
  rules: Rule[],
  state: CompileState,
  containers: ContainerCondition[] = []
) {
  let declarations: Declaration[] = []
  const flush = () => {
    if (declarations.length && parent) {
      rules.push({
        selectors: parent,
        declarations,
        order: state.order++,
        layer,
        rank: 0,
        containers: containers.length ? containers : undefined,
      })
    }
    declarations = []
  }

  for (const item of items) {
    if (Array.isArray(item)) {
      declarations.push(item)
      if (typeof item[1] === 'string' && CONTAINER_UNIT.test(item[1])) {
        state.containerUnits = true
      }
      continue
    }
    flush()
    if (item.s) {
      // Like in browsers, a selector list with an invalid selector is invalid.
      const selectors = item.s.map((selector) =>
        compileSelector(selector, parent)
      )
      if (selectors.every(Boolean)) {
        compileRules(item.b, selectors, layer, rules, state, containers)
      }
    } else if (item.m !== undefined) {
      if (matchesMedia(item.m, state.viewport)) {
        compileRules(item.b, parent, layer, rules, state, containers)
      }
    } else if (item.u !== undefined) {
      if (matchesSupports(item.u, state.supported)) {
        compileRules(item.b, parent, layer, rules, state, containers)
      }
    } else if (item.c !== undefined) {
      state.containerRules = true
      compileRules(item.b, parent, layer, rules, state, [
        ...containers,
        parseContainerPrelude(item.c),
      ])
    } else if (item.p !== undefined) {
      registerProperty(item.p, item.b ?? [], state.properties)
    } else if (item.l) {
      if (!item.b) {
        for (const name of item.l) {
          declareLayer([...layer, ...name.split('.')], state)
        }
        continue
      }
      const name = item.l[0]?.split('.') ?? [`\0${state.anonymousLayers++}`]
      const nested = [...layer, ...name]
      declareLayer(nested, state)
      compileRules(item.b, parent, nested, rules, state, containers)
    }
  }
  flush()
}

/**
 * Registers a custom property of `@property`, if its descriptors are valid.
 * Like in browsers, the last valid rule for a property wins.
 */
function registerProperty(
  name: string,
  descriptors: Item[],
  properties: Map<string, RegisteredProperty>
) {
  const values = new Map<string, string>()
  for (const item of descriptors) {
    if (Array.isArray(item)) {
      values.set(item[0].toLowerCase(), String(item[1]).trim())
    }
  }
  const syntax = values.get('syntax')
  const inherits = values.get('inherits')?.toLowerCase()
  const initial = values.get('initial-value')
  if (syntax === undefined || (inherits !== 'true' && inherits !== 'false')) {
    return
  }
  // Only the universal syntax `"*"` doesn't need an initial value.
  if (initial === undefined && !/^(['"])\s*\*\s*\1$/.test(syntax)) return
  properties.set(name, { inherits: inherits === 'true', initial })
}

/** The initial values of registered custom properties, if any. */
function getInitialValues(
  properties: Map<string, RegisteredProperty>
): InitialValues | undefined {
  const all: InitialValues['all'] = []
  const notInherited: InitialValues['notInherited'] = []
  for (const [name, { inherits, initial }] of properties) {
    if (initial === undefined) continue
    all.push([name, initial])
    if (!inherits) notInherited.push([name, initial])
  }
  return all.length ? { all, notInherited } : undefined
}

function declareLayer(layer: string[], state: CompileState) {
  for (let i = 1; i <= layer.length; i++) {
    const name = layer.slice(0, i).join('.')
    if (!state.layers.has(name)) state.layers.set(name, state.layers.size)
  }
}

/**
 * Ranks the layers of rules. Layers are ordered by when they're first
 * declared, the rules of a layer come after its sublayers, and rules without
 * a layer come last.
 */
function rankLayers(rules: Rule[], layers: Map<string, number>) {
  const key = (layer: string[]) => [
    ...layer.map((_, i) => layers.get(layer.slice(0, i + 1).join('.'))),
    Infinity,
  ]
  const compare = (a: number[], b: number[]) => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i]
    }
    return 0
  }
  const keys = new Map<string, number[]>()
  for (const rule of rules) keys.set(rule.layer.join('.'), key(rule.layer))
  const ranked = [...keys.entries()].sort((a, b) => compare(a[1], b[1]))
  const ranks = new Map(ranked.map(([name], index) => [name, index]))
  for (const rule of rules) rule.rank = ranks.get(rule.layer.join('.'))
}

function hasNesting(value: unknown): boolean {
  if (!Array.isArray(value)) return false
  if (value.length === 1 && value[0] === '&') return true
  return value.some(hasNesting)
}

/**
 * Compiles a selector. In nested rules, selectors without `&` are relative to
 * the parent rule, and `&` matches what the parent rule matches, like
 * `:is()`.
 */
function compileSelector(
  raw: RawComplex,
  parent: Selector[] | null
): Selector | null {
  let parts = raw
  if (parent && !hasNesting(raw)) {
    parts =
      typeof raw[0] === 'string' ? [[['&']], ...raw] : [[['&']], ' ', ...raw]
  }
  return compileParts(parts, parent, true)
}

/** Compiles a relative selector of `:has()`, anchored at its element. */
function compileRelativeSelector(
  raw: RawComplex,
  parent: Selector[] | null
): Selector | null {
  return compileParts(
    typeof raw[0] === 'string' ? [[['@']], ...raw] : [[['@']], ' ', ...raw],
    parent
  )
}

/**
 * Compiles the parts of a selector. A pseudo-element can only end the
 * selector of a rule, and the rest matches its originating element.
 */
function compileParts(
  raw: RawComplex,
  parent: Selector[] | null,
  allowPseudo = false
): Selector | null {
  const parts: Selector['parts'] = []
  let specificity = 0
  let pseudo: string | undefined
  for (let i = 0; i < raw.length; i++) {
    const part = raw[i]
    if (typeof part === 'string') {
      parts.push(part)
      continue
    }
    const compound: Compound = []
    for (let j = 0; j < part.length; j++) {
      if (part[j][0] === '::') {
        const last = i === raw.length - 1 && j === part.length - 1
        if (!allowPseudo || !last) return null
        pseudo = part[j][1]
        specificity += TYPE
        continue
      }
      const simple = compileSimple(part[j], parent)
      if (!simple) return null
      compound.push(simple)
      specificity += simpleSpecificity(simple)
    }
    parts.push(compound)
  }
  return { parts, specificity, pseudo }
}

function compileList(
  raw: RawComplex[],
  parent: Selector[] | null,
  forgiving: boolean,
  relative = false
): Selector[] | null {
  const selectors: Selector[] = []
  for (const selector of raw) {
    const compiled = relative
      ? compileRelativeSelector(selector, parent)
      : compileParts(selector, parent)
    if (compiled) selectors.push(compiled)
    else if (!forgiving) return null
  }
  return selectors
}

function compileSimple(
  simple: RawSimple,
  parent: Selector[] | null
): Simple | null {
  switch (simple[0]) {
    case 't':
      return ['t', simple[1].toLowerCase()]
    case '[':
      return ['[', simple[1].toLowerCase(), ...simple.slice(2)]
    case '&':
      return ['&', parent]
    case ':': {
      const name = simple[1]
      if (LOGICAL_PSEUDO_CLASSES.has(name)) {
        const forgiving = name === 'is' || name === 'where'
        const list = compileList(simple[2], parent, forgiving, name === 'has')
        return list && [':', name, list]
      }
      if (name.startsWith('nth-')) {
        const of = simple[4] && compileList(simple[4], parent, false)
        if (simple[4] && !of) return null
        return [':', name, simple[2], simple[3], of]
      }
      if (name === 'lang') return simple
      if (NEVER_MATCHING_FUNCTIONS.has(name)) return [':', name]
      // Other functional pseudo-classes aren't supported.
      return simple.length === 2 && PSEUDO_CLASSES.has(name) ? simple : null
    }
    default:
      return simple
  }
}

function maxSpecificity(selectors: Selector[] | null) {
  let max = 0
  for (const selector of selectors || []) {
    max = Math.max(max, selector.specificity)
  }
  return max
}

function simpleSpecificity(simple: Simple): number {
  switch (simple[0]) {
    case '#':
      return ID
    case '.':
    case '[':
      return CLASS
    case 't':
      return TYPE
    case '&':
      // `&` without a parent rule is `:scope`.
      return simple[1] ? maxSpecificity(simple[1]) : CLASS
    case ':':
      switch (simple[1]) {
        case 'where':
          return 0
        case 'is':
        case 'not':
        case 'has':
          return maxSpecificity(simple[2])
        default:
          return simple[1].startsWith('nth-')
            ? CLASS + maxSpecificity(simple[4])
            : CLASS
      }
    default:
      return 0
  }
}

function buildNodes(
  children: ReactNode,
  parent: Node | null,
  siblings: Node[],
  lang?: string
) {
  for (const child of normalizeChildren(children)) {
    if (typeof child === 'string') {
      if (parent) parent.text = true
      continue
    }
    if (!isReactElement(child) || typeof child.type !== 'string') continue
    const props = child.props || {}
    const className = props.className ?? props.class
    const node: Node = {
      type: child.type.toLowerCase(),
      props,
      parent,
      siblings,
      index: siblings.length,
      children: [],
      text: false,
      classes:
        typeof className === 'string'
          ? className.split(/\s+/).filter(Boolean)
          : [],
      lang: props.lang ?? lang,
      svg: !!parent && (parent.svg || parent.type === 'svg'),
    }
    siblings.push(node)
    buildNodes(props.children, node, node.children, node.lang)
  }
}

/**
 * Rebuilds the children with the styles of the stylesheets, and the
 * `::before` and `::after` pseudo-elements.
 */
function rebuild(children: ReactNode, nodes: Node[], context: RebuildContext) {
  let index = 0
  return normalizeChildren(children).map((child) => {
    if (!isReactElement(child) || typeof child.type !== 'string') return child
    const node = nodes[index++]
    const props: Record<string, any> = { ...child.props }
    const style = cascade(node, context)
    if (style) props.style = style
    if (node.matched.placeholder?.length) {
      props[PLACEHOLDER_PROP] = cascade(node, context, 'placeholder')
    }
    if (node.container) props[CONTAINER_PROP] = node.container.index
    let content: ReactNode[] | undefined =
      props.children === undefined
        ? undefined
        : rebuild(props.children, node.children, context)
    if (node.matched.before) {
      const before = generateContent(node, context, 'before')
      const after = generateContent(node, context, 'after')
      if (before || after) {
        content = [before, ...(content ?? []), after].filter(Boolean)
      }
    }
    if (content !== undefined) props.children = content
    return { ...child, props }
  })
}

/** Elements without `::before` and `::after`, e.g. replaced elements. */
const NO_GENERATED_CONTENT = new Set([
  'img',
  'svg',
  'canvas',
  'video',
  'audio',
  'iframe',
  'object',
  'embed',
  'input',
  'textarea',
  'select',
  'br',
  'wbr',
])

const QUOTES: Record<string, string> = {
  'open-quote': '\u201c',
  'close-quote': '\u201d',
  'no-open-quote': '',
  'no-close-quote': '',
}

const element = (type: string, props: Record<string, unknown>) =>
  ({ type, key: null, props } as unknown as ReactElement)

/**
 * The `::before` or `::after` pseudo-element of an element, unless its
 * `content` is `none` or `normal`. It's a child that selectors don't match.
 * Counters in its content are resolved in layout, at its position in the
 * tree, see `layout()`.
 */
function generateContent(
  node: Node,
  context: RebuildContext,
  pseudo: 'before' | 'after'
) {
  const style = cascade(node, context, pseudo)
  const content = style?.content
  if (!Array.isArray(content)) return
  delete style.content
  const children = (content as ContentPart[]).map((part) => {
    if (typeof part === 'string') return part
    switch (part[0]) {
      case 'attr':
        return getAttribute(node, part[1].toLowerCase()) ?? part[2] ?? ''
      case 'quote':
        return QUOTES[part[1]]
      case 'url':
        return element('img', { src: part[1], __naturalSize: true })
      case 'counter':
        return element('::counter', {
          name: part[1],
          separator: part[2],
          counterStyle: part[3],
        })
    }
    return ''
  })
  return element('::' + pseudo, { style, children })
}

/** Converts a property name to the camel case of inline styles. */
function toPropertyName(name: string) {
  if (name.startsWith('--')) return name
  // `-webkit-line-clamp` is `WebkitLineClamp`, but `-ms-` is `ms`.
  const vendor = name.startsWith('-') && !name.startsWith('-ms-')
  const camel = name
    .replace(/^-/, '')
    .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
  return vendor ? camel[0].toUpperCase() + camel.slice(1) : camel
}

interface Match {
  declaration: Declaration
  rule: Rule
  specificity: number
}

/**
 * The rules that match an element, or its `pseudo` element. The containers of
 * its ancestors are known, and its own one for its pseudo-elements.
 */
function matchRules(
  node: Node,
  rules: Rule[],
  sizes: Map<number, ContainerSize> | undefined,
  pseudo?: string
) {
  const matched: MatchedRule[] = []
  for (const rule of rules) {
    if (
      rule.containers &&
      !rule.containers.every((condition) =>
        matchesContainer(condition, pseudo ? node : node.parent, sizes)
      )
    ) {
      continue
    }
    let specificity = -1
    for (const selector of rule.selectors) {
      if (
        selector.pseudo === pseudo &&
        selector.specificity > specificity &&
        matches(selector, node)
      ) {
        specificity = selector.specificity
      }
    }
    if (specificity >= 0) matched.push({ rule, specificity })
  }
  return matched
}

const CSS_WIDE_KEYWORDS = /^(inherit|initial|unset|revert|revert-layer)$/i

/**
 * The declarations of matching rules with invalid or unsupported values,
 * which are dropped like in browsers, so that earlier declarations apply
 * instead, and their errors are reported once each, in source order. Like in
 * browsers, values with `var()` are valid until they're computed.
 */
async function findInvalidDeclarations(
  nodes: Node[],
  { getError, onError }: Validation
) {
  const byKey = new Map<string, Declaration[]>()
  for (const node of nodes) {
    for (const matched of Object.values(node.matched)) {
      for (const { rule } of matched) {
        for (const declaration of rule.declarations) {
          const [name, value] = declaration
          if (
            typeof value !== 'string' ||
            name.startsWith('--') ||
            CSS_WIDE_KEYWORDS.test(value) ||
            /var\(/i.test(value)
          ) {
            continue
          }
          const key = name + ':' + value
          const declarations = byKey.get(key)
          if (declarations) declarations.push(declaration)
          else byKey.set(key, [declaration])
        }
      }
    }
  }
  const groups = [...byKey.values()]
  const errors = await Promise.all(
    groups.map(async ([[name, value]]) => {
      // Container units are resolved in the cascade, so they're checked as
      // lengths.
      const original = value as string
      const checked = CONTAINER_UNIT.test(original)
        ? replaceContainerUnits(original, () => '0px')
        : original
      const error = await getError(toPropertyName(name), checked)
      return error && checked !== original
        ? new Error(error.message.split(checked).join(original))
        : error
    })
  )
  const invalid = new Set<Declaration>()
  groups.forEach((declarations, index) => {
    const error = errors[index]
    if (!error) return
    for (const declaration of declarations) invalid.add(declaration)
    onError?.(error)
  })
  return invalid
}

/**
 * The style of an element, or of its `pseudo` element, with the matching
 * declarations, in cascade order: normal declarations by layer, specificity
 * and order, then the inline style, then important declarations, where
 * earlier layers win. Then the `initial` values of registered properties it
 * needs, see `initialValuesFor()`.
 */
function cascade(
  node: Node,
  { invalid, initial, units }: RebuildContext,
  pseudo?: 'before' | 'after' | 'placeholder'
) {
  const normal: Match[] = []
  const important: Match[] = []
  for (const { rule, specificity } of node.matched[pseudo ?? '']) {
    for (const declaration of rule.declarations) {
      // `content` only applies to pseudo-elements.
      if (!pseudo && declaration[0] === 'content') continue
      if (invalid.has(declaration)) continue
      ;(declaration[2] ? important : normal).push({
        declaration,
        rule,
        specificity,
      })
    }
  }
  const values = initial
    ? initialValuesFor(pseudo ? node : node.parent, initial)
    : []
  if (!normal.length && !important.length && !values.length) {
    if (!pseudo) node.custom = getCustomProperties(node.props.style)
    return
  }

  // Sorting is stable, so declarations of a rule stay in order.
  normal.sort(
    (a, b) =>
      a.rule.rank - b.rule.rank ||
      a.specificity - b.specificity ||
      a.rule.order - b.rule.order
  )
  important.sort(
    (a, b) =>
      b.rule.rank - a.rule.rank ||
      a.specificity - b.specificity ||
      a.rule.order - b.rule.order
  )

  // Later properties override earlier ones in order, including shorthands
  // and their longhands, so overridden ones are moved to the end.
  const style: Record<string, unknown> = {}
  const set = (name: string, value: unknown) => {
    delete style[name]
    style[name] = value
  }
  for (const { declaration } of normal) {
    set(toPropertyName(declaration[0]), declaration[1])
  }
  if (!pseudo) {
    for (const [name, value] of Object.entries(node.props.style ?? {})) {
      set(name, value)
    }
  }
  for (const { declaration } of important) {
    set(toPropertyName(declaration[0]), declaration[1])
  }
  if (!pseudo) node.custom = getCustomProperties(style)
  for (const [name, value] of values) {
    if (!(name in style)) style[name] = value
  }
  if (units) resolveContainerUnits(style, pseudo ? node : node.parent, units)
  return style
}

/** A quick check for container units, see `replaceContainerUnits()`. */
const CONTAINER_UNIT = /\d(cqw|cqh|cqi|cqb|cqmin|cqmax)\b/i
const CONTAINER_UNITS = new Set(['cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax'])

const isDigit = (char: string | undefined) =>
  char !== undefined && char >= '0' && char <= '9'
const isNameStart = (char: string | undefined) =>
  char !== undefined &&
  ((char >= 'a' && char <= 'z') ||
    (char >= 'A' && char <= 'Z') ||
    char === '_' ||
    char >= '\u0080')
const isName = (char: string | undefined) =>
  isNameStart(char) || isDigit(char) || char === '-'

/**
 * Replaces the container units in a value, e.g. `1.5cqw`, with the result of
 * `replace`. Like a CSS tokenizer, it skips strings and identifiers, and it
 * reads each character once, as values come from stylesheets: a regular
 * expression could backtrack for a long time on long numbers.
 */
function replaceContainerUnits(
  value: string,
  replace: (amount: number, unit: string) => string
) {
  let result = ''
  let i = 0
  while (i < value.length) {
    const char = value[i]
    let end = i + 1
    if (char === '"' || char === "'") {
      while (end < value.length && value[end] !== char) {
        end += value[end] === '\\' ? 2 : 1
      }
      end = Math.min(end + 1, value.length)
    } else if (
      isNameStart(char) ||
      (char === '-' && (isNameStart(value[i + 1]) || value[i + 1] === '-'))
    ) {
      while (isName(value[end])) end++
    } else {
      // A number, with a sign, a fraction and an exponent, then its unit.
      let j = char === '+' || char === '-' ? i + 1 : i
      if (isDigit(value[j]) || (value[j] === '.' && isDigit(value[j + 1]))) {
        while (isDigit(value[j])) j++
        if (value[j] === '.' && isDigit(value[j + 1])) {
          j++
          while (isDigit(value[j])) j++
        }
        const sign = value[j + 1] === '+' || value[j + 1] === '-' ? 1 : 0
        if (
          (value[j] === 'e' || value[j] === 'E') &&
          isDigit(value[j + 1 + sign])
        ) {
          j += 1 + sign
          while (isDigit(value[j])) j++
        }
        end = j
        while (isName(value[end])) end++
        const unit = value.slice(j, end).toLowerCase()
        if (CONTAINER_UNITS.has(unit)) {
          result += replace(parseFloat(value.slice(i, j)), unit)
          i = end
          continue
        }
      }
    }
    result += value.slice(i, end)
    i = end
  }
  return result
}

/**
 * Resolves container units to px, with the size of the nearest query
 * container that `start` is in or is, whose type allows the axis. Without
 * one, or before the layout, they're of the viewport, like in browsers.
 * Custom properties are resolved where they're used, so they're kept.
 */
function resolveContainerUnits(
  style: Record<string, unknown>,
  start: Node | null,
  { sizes, viewport }: NonNullable<RebuildContext['units']>
) {
  const size = (block: boolean) => {
    for (let node = start; node; node = node.parent) {
      const container = node.container
      if (!container || (block && container.type !== 'size')) continue
      const containerSize = sizes?.get(container.index)
      if (containerSize)
        return block ? containerSize.height : containerSize.width
      break
    }
    return (block ? viewport.height : viewport.width) ?? 0
  }
  for (const [name, value] of Object.entries(style)) {
    if (
      name.startsWith('--') ||
      typeof value !== 'string' ||
      !CONTAINER_UNIT.test(value)
    ) {
      continue
    }
    style[name] = replaceContainerUnits(value, (amount, unit) => {
      const inline = size(false)
      const block = size(true)
      const base = {
        cqw: inline,
        cqi: inline,
        cqh: block,
        cqb: block,
        cqmin: Math.min(inline, block),
        cqmax: Math.max(inline, block),
      }[unit]
      return `${(amount * base) / 100}px`
    })
  }
}

function getCustomProperties(style: Record<string, unknown> | undefined) {
  if (!style) return
  const names = Object.keys(style).filter((name) => name.startsWith('--'))
  return names.length ? new Set(names) : undefined
}

/**
 * The initial values of registered custom properties that an element needs,
 * the child of `parent`. Custom properties are inherited in the layout, so
 * the root needs all of them. Other elements only need the ones that aren't
 * inherited, if their parent declares another value, like in browsers.
 */
function initialValuesFor(parent: Node | null, initial: InitialValues) {
  if (!parent) return initial.all
  const custom = parent.custom
  if (!custom) return []
  return initial.notInherited.filter(([name]) => custom.has(name))
}

/** Matches selectors from right to left. */
function matches(selector: Selector, node: Node, anchor?: Node): boolean {
  return matchesFrom(selector.parts, selector.parts.length - 1, node, anchor)
}

function matchesFrom(
  parts: Selector['parts'],
  index: number,
  node: Node,
  anchor: Node | undefined
): boolean {
  if (!matchesCompound(parts[index] as Compound, node, anchor)) return false
  if (index === 0) return true
  const next = (other: Node) => matchesFrom(parts, index - 2, other, anchor)
  switch (parts[index - 1]) {
    case '>':
      return !!node.parent && next(node.parent)
    case ' ':
      for (let other = node.parent; other; other = other.parent) {
        if (next(other)) return true
      }
      return false
    case '+':
      return node.index > 0 && next(node.siblings[node.index - 1])
    case '~':
      for (let i = node.index - 1; i >= 0; i--) {
        if (next(node.siblings[i])) return true
      }
      return false
  }
  return false
}

function matchesCompound(
  compound: Compound,
  node: Node,
  anchor: Node | undefined
) {
  for (const simple of compound) {
    switch (simple[0]) {
      case 't':
        if (node.type !== simple[1]) return false
        break
      case '#':
        if (node.props.id == null || String(node.props.id) !== simple[1]) {
          return false
        }
        break
      case '.':
        if (!node.classes.includes(simple[1])) return false
        break
      case '[':
        if (!matchesAttribute(node, simple)) return false
        break
      case '&':
        // It doesn't represent pseudo-elements of the parent rule.
        if (
          simple[1]
            ? !simple[1].some(
                (selector: Selector) =>
                  !selector.pseudo && matches(selector, node)
              )
            : node.parent
        ) {
          return false
        }
        break
      case '@':
        if (node !== anchor) return false
        break
      case ':':
        if (!matchesPseudoClass(simple, node)) return false
        break
    }
  }
  return true
}

/** The value of an attribute from the props of an element. */
function getAttribute(node: Node, name: string): string | undefined {
  const { props } = node
  let value: unknown
  if (name === 'class') value = props.className ?? props.class
  else if (name === 'for') value = props.htmlFor ?? props.for
  else {
    for (const key in props) {
      if (key !== 'children' && key.toLowerCase() === name) {
        value = props[key]
        break
      }
    }
  }
  if (value == null || value === false) return
  if (value === true) return ''
  if (typeof value === 'object') return name === 'style' ? '' : undefined
  return String(value)
}

function matchesAttribute(node: Node, [, name, operator, value, flag]: Simple) {
  let actual = getAttribute(node, name)
  if (actual === undefined) return false
  if (!operator) return true
  let expected: string = value
  if (flag === 'i') {
    actual = actual.toLowerCase()
    expected = expected.toLowerCase()
  }
  switch (operator) {
    case '=':
      return actual === expected
    case '~=':
      return (
        !!expected &&
        !/\s/.test(expected) &&
        actual.split(/\s+/).includes(expected)
      )
    case '|=':
      return actual === expected || actual.startsWith(expected + '-')
    case '^=':
      return !!expected && actual.startsWith(expected)
    case '$=':
      return !!expected && actual.endsWith(expected)
    case '*=':
      return !!expected && actual.includes(expected)
  }
  return false
}

/** The position of an element among its siblings that pass `filter`. */
function position(node: Node, fromEnd: boolean, filter: (n: Node) => boolean) {
  let count = 0
  const { siblings, index } = node
  if (fromEnd) {
    for (let i = siblings.length - 1; i >= index; i--) {
      if (filter(siblings[i])) count++
    }
  } else {
    for (let i = 0; i <= index; i++) if (filter(siblings[i])) count++
  }
  return count
}

function matchesNth(a: number, b: number, index: number) {
  if (a === 0) return index === b
  const n = (index - b) / a
  return Number.isInteger(n) && n >= 0
}

function matchesPseudoClass(simple: Simple, node: Node): boolean {
  const name: string = simple[1]
  const sameType = (other: Node) => other.type === node.type
  switch (name) {
    case 'root':
    case 'scope':
      return !node.parent
    case 'empty':
      return !node.children.length && !node.text
    case 'first-child':
      return node.index === 0
    case 'last-child':
      return node.index === node.siblings.length - 1
    case 'only-child':
      return node.siblings.length === 1
    case 'first-of-type':
      return position(node, false, sameType) === 1
    case 'last-of-type':
      return position(node, true, sameType) === 1
    case 'only-of-type':
      return (
        position(node, false, sameType) === 1 &&
        position(node, true, sameType) === 1
      )
    case 'nth-child':
    case 'nth-last-child':
    case 'nth-of-type':
    case 'nth-last-of-type': {
      const [, , a, b, of] = simple as [string, string, number, number, any]
      const filter = name.endsWith('of-type')
        ? sameType
        : of
        ? (other: Node) =>
            of.some((selector: Selector) => matches(selector, other))
        : () => true
      if (!filter(node)) return false
      return matchesNth(
        a,
        b,
        position(node, name.startsWith('nth-last'), filter)
      )
    }
    case 'not':
      return !simple[2].some((selector: Selector) => matches(selector, node))
    case 'is':
    case 'where':
      return simple[2].some((selector: Selector) => matches(selector, node))
    case 'has':
      return simple[2].some((selector: Selector) => matchesHas(selector, node))
    case 'link':
    case 'any-link':
    case '-webkit-any-link':
      return (
        (node.type === 'a' || node.type === 'area') && node.props.href != null
      )
    case 'lang':
      return simple[2].some((range: string) => matchesLang(node.lang, range))
    case 'defined':
    case 'read-only':
      return true
    default:
      return false
  }
}

/** Matches a relative selector of `:has()`, anchored at the element. */
function matchesHas(selector: Selector, node: Node) {
  const candidates: Node[] = []
  const addDescendants = (parent: Node) => {
    for (const child of parent.children) {
      candidates.push(child)
      addDescendants(child)
    }
  }
  const combinator = selector.parts[1]
  if (combinator === ' ' || combinator === '>') {
    addDescendants(node)
  } else {
    for (let i = node.index + 1; i < node.siblings.length; i++) {
      candidates.push(node.siblings[i])
      addDescendants(node.siblings[i])
    }
  }
  return candidates.some((candidate) => matches(selector, candidate, node))
}

function matchesLang(lang: string | undefined, range: string) {
  if (lang === undefined) return false
  if (range === '*') return true
  const value = lang.toLowerCase()
  const expected = range.toLowerCase()
  return value === expected || value.startsWith(expected + '-')
}

/** Splits text at a separator outside of parentheses. */
function splitTopLevel(text: string, separator: string) {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '(') depth++
    else if (c === ')') depth--
    else if (c === separator && depth === 0) {
      parts.push(text.slice(start, i))
      start = i + 1
    }
  }
  parts.push(text.slice(start))
  return parts
}

/**
 * Splits a condition into the parenthesized groups or functions and the
 * keywords between them, or returns `null` if it's invalid.
 */
function splitCondition(text: string) {
  const groups: string[] = []
  const keywords: string[] = []
  let i = 0
  while (i < text.length) {
    if (/\s/.test(text[i])) {
      i++
      continue
    }
    const word = /^[a-z-]+/i.exec(text.slice(i))?.[0] ?? ''
    if (text[i + word.length] === '(') {
      // A group, or a function like `selector()`.
      let depth = 0
      let end = i + word.length
      for (; end < text.length; end++) {
        if (text[end] === '(') depth++
        else if (text[end] === ')' && --depth === 0) break
      }
      if (depth) return null
      groups.push(text.slice(i, end + 1))
      i = end + 1
    } else if (word) {
      keywords.push(word.toLowerCase())
      i += word.length
    } else {
      return null
    }
  }
  return { groups, keywords }
}

/**
 * Evaluates a condition of `@media` or `@supports`, with `not`, `and` and
 * `or`, where `group` evaluates groups in parentheses.
 */
function matchesCondition(
  text: string,
  group: (inner: string) => boolean
): boolean {
  const split = splitCondition(text.trim())
  if (!split || !split.groups.length) return false
  const { groups, keywords } = split
  const value = (g: string) =>
    g.startsWith('(') ? group(g.slice(1, -1).trim()) : group(g)
  if (keywords.length === 1 && keywords[0] === 'not' && groups.length === 1) {
    return !value(groups[0])
  }
  if (keywords.length !== groups.length - 1) return false
  if (keywords.every((keyword) => keyword === 'and')) {
    return groups.every(value)
  }
  if (keywords.every((keyword) => keyword === 'or')) {
    return groups.some(value)
  }
  return false
}

/** Evaluates a media query list, e.g. `screen and (width >= 600px)`. */
export function matchesMedia(text: string, viewport: Viewport): boolean {
  if (!text.trim()) return true
  return splitTopLevel(text.toLowerCase(), ',').some((query) => {
    query = query.trim()
    const typed = /^(?:(not|only)\s+)?([a-z-]+)(?:\s+and\s+([^]*))?$/.exec(
      query
    )
    const features: Features = (name) => mediaFeature(name, viewport)
    if (typed && !['not', 'only', 'and', 'or'].includes(typed[2])) {
      const result =
        (typed[2] === 'all' || typed[2] === 'screen') &&
        (typed[3] === undefined ||
          matchesCondition(typed[3], (inner) =>
            matchesMediaGroup(inner, features)
          ))
      return typed[1] === 'not' ? !result : result
    }
    return matchesCondition(query, (inner) =>
      matchesMediaGroup(inner, features)
    )
  })
}

/** The values of the features of media or container queries. */
type Features = (name: string) => string | number | undefined

function matchesMediaGroup(inner: string, features: Features): boolean {
  if (inner.startsWith('(') || /^not\b/.test(inner)) {
    return matchesCondition(inner, (g) => matchesMediaGroup(g, features))
  }
  return matchesMediaFeature(inner, features)
}

/**
 * The name and condition of a `@container` rule. The name is optional, and so
 * is the condition if there's a name.
 */
function parseContainerPrelude(prelude: string): ContainerCondition {
  const text = prelude.trim()
  const named = /^(-?[a-z_][\w-]*)(?![\w-(])\s*([^]*)$/i.exec(text)
  if (named && !/^(not|and|or|none)$/i.test(named[1])) {
    return { name: named[1], query: named[2].toLowerCase() }
  }
  return { query: text.toLowerCase() }
}

/**
 * The query container of an element, if it's one: its `container-type`, and
 * its `container-name` for named queries.
 */
function getContainer(node: Node, index: number): Container | undefined {
  const style = cascade(node, { invalid: new Set() }) ?? {}
  let type = ''
  let names = ''
  // The shorthand and longhands override each other in cascade order.
  for (const [key, value] of Object.entries(style)) {
    if (key === 'container') {
      const [name, containerType = 'normal'] = String(value).split('/')
      names = name
      type = containerType
    } else if (key === 'containerType') {
      type = String(value)
    } else if (key === 'containerName') {
      names = String(value)
    }
  }
  type = type.trim().toLowerCase()
  if (type !== 'inline-size' && type !== 'size') return
  return {
    index,
    type,
    names: names
      .trim()
      .split(/\s+/)
      .filter((name) => name && name !== 'none'),
  }
}

/**
 * Evaluates a container condition with the nearest container from `start`
 * that has its name and the size it queries. Heights and ratios are only
 * known for `size` containers.
 */
function matchesContainer(
  { name, query }: ContainerCondition,
  start: Node | null,
  sizes: Map<number, ContainerSize> | undefined
) {
  const block = /\b(height|block-size|aspect-ratio|orientation)\b/.test(query)
  for (let node = start; node; node = node.parent) {
    const container = node.container
    if (!container) continue
    if (name && !container.names.includes(name)) continue
    if (block && container.type !== 'size') continue
    const size = sizes?.get(container.index)
    if (!size) return false
    if (!query) return true
    const features: Features = (feature) => containerFeature(feature, size)
    return matchesCondition(query, (inner) =>
      matchesMediaGroup(inner, features)
    )
  }
  return false
}

/** The value of a size feature of a container. */
function containerFeature(name: string, { width, height }: ContainerSize) {
  switch (name) {
    case 'width':
    case 'inline-size':
      return width
    case 'height':
    case 'block-size':
      return height
    case 'aspect-ratio':
      return height ? width / height : undefined
    case 'orientation':
      return height >= width ? 'portrait' : 'landscape'
  }
}

/** The value of a media feature, for a static image. */
function mediaFeature(name: string, { width, height }: Viewport) {
  switch (name) {
    case 'width':
      return width
    case 'height':
      return height
    case 'aspect-ratio':
      return width && height ? width / height : undefined
    case 'orientation':
      return width && height
        ? height >= width
          ? 'portrait'
          : 'landscape'
        : undefined
    case 'prefers-color-scheme':
      return 'light'
    case 'prefers-reduced-motion':
    case 'prefers-reduced-transparency':
    case 'prefers-contrast':
      return 'no-preference'
    case 'hover':
    case 'any-hover':
    case 'pointer':
    case 'any-pointer':
    case 'scripting':
    case 'update':
      return 'none'
    case 'color':
      return 8
    case 'monochrome':
    case 'grid':
      return 0
  }
}

function parseMediaValue(text: string): number | undefined {
  const ratio = /^([\d.]+)\s*\/\s*([\d.]+)$/.exec(text)
  if (ratio) return Number(ratio[1]) / Number(ratio[2])
  const length = /^(-?[\d.]+)(px|em|rem)?$/.exec(text)
  if (!length) return
  return Number(length[1]) * (length[2] && length[2] !== 'px' ? 16 : 1)
}

function compareMedia(
  name: string,
  operator: string,
  text: string,
  features: Features
) {
  const actual = features(name)
  if (actual === undefined) return false
  if (typeof actual === 'string') return operator === '=' && actual === text
  const expected = parseMediaValue(text)
  if (expected === undefined) return false
  switch (operator) {
    case '=':
      return actual === expected
    case '<':
      return actual < expected
    case '<=':
      return actual <= expected
    case '>':
      return actual > expected
    case '>=':
      return actual >= expected
  }
  return false
}

const FLIPPED: Record<string, string> = {
  '<': '>',
  '<=': '>=',
  '>': '<',
  '>=': '<=',
  '=': '=',
}

function matchesMediaFeature(text: string, features: Features): boolean {
  const range = text.split(/\s*(<=|>=|<|>|=)\s*/)
  if (range.length === 3) {
    const [left, operator, right] = range
    return /^[a-z-]+$/.test(left)
      ? compareMedia(left, operator, right, features)
      : compareMedia(right, FLIPPED[operator], left, features)
  }
  if (range.length === 5) {
    const [low, lowOperator, name, highOperator, high] = range
    return (
      compareMedia(name, FLIPPED[lowOperator], low, features) &&
      compareMedia(name, highOperator, high, features)
    )
  }
  if (range.length !== 1) return false

  const colon = text.indexOf(':')
  if (colon < 0) {
    // In a boolean context, features match unless they're 0 or none.
    const value = features(text)
    return (
      value !== undefined &&
      value !== 0 &&
      value !== 'none' &&
      value !== 'no-preference'
    )
  }
  const name = text.slice(0, colon).trim()
  const value = text.slice(colon + 1).trim()
  const prefix = /^(min|max)-/.exec(name)?.[1]
  return compareMedia(
    prefix ? name.slice(4) : name,
    prefix === 'min' ? '>=' : prefix === 'max' ? '<=' : '=',
    value,
    features
  )
}

/**
 * Evaluates a condition of `@supports`. Declarations are supported if they're
 * in `supported`, or valid if they aren't, and `selector()` is supported.
 */
export function matchesSupports(
  text: string,
  supported?: Map<string, boolean>
): boolean {
  return matchesCondition(text, function group(inner): boolean {
    if (/^selector\(/i.test(inner)) return true
    if (/^[a-z-]+\(/i.test(inner)) return false
    if (inner.startsWith('(') || /^not\b/i.test(inner)) {
      return matchesCondition(inner, group)
    }
    if (!/^--|^[a-z-]+\s*:/i.test(inner)) return false
    return supported?.get(inner) ?? true
  })
}

/** Collects the declarations in a condition of `@supports`. */
function collectSupportsDeclarations(text: string, declarations: Set<string>) {
  for (const group of splitCondition(text.trim())?.groups ?? []) {
    if (!group.startsWith('(')) continue
    const inner = group.slice(1, -1).trim()
    if (inner.startsWith('(') || /^not\b/i.test(inner)) {
      collectSupportsDeclarations(inner, declarations)
    } else if (/^[a-z-]+\s*:/i.test(inner)) {
      declarations.add(inner)
    }
  }
}

/**
 * Which declarations of `@supports` conditions are supported, as the
 * declarations of stylesheets are validated.
 */
async function checkSupportsDeclarations(
  sheets: Item[][],
  getError: Validation['getError']
) {
  const declarations = new Set<string>()
  const visit = (items: Item[]) => {
    for (const item of items) {
      if (Array.isArray(item)) continue
      if (item.u !== undefined)
        collectSupportsDeclarations(item.u, declarations)
      if (item.b) visit(item.b)
    }
  }
  sheets.forEach(visit)
  const supported = new Map<string, boolean>()
  await Promise.all(
    [...declarations].map(async (declaration) => {
      const colon = declaration.indexOf(':')
      const name = toPropertyName(
        declaration.slice(0, colon).trim().toLowerCase()
      )
      const value = declaration.slice(colon + 1).trim()
      supported.set(declaration, !(await getError(name, value)))
    })
  )
  return supported
}
