/**
 * Parses the CSS Grid properties for the layout engine:
 * https://www.w3.org/TR/css-grid-1/
 */

import type {
  GridLine,
  GridRepeat,
  GridTemplateAreas,
  GridTrackBreadth,
  GridTrackList,
  GridTrackSize,
} from '../layout-engine/node.js'

/** Resolves a length to px, or returns `undefined` if it isn't one. */
export type ResolveLength = (value: string) => number | undefined

type Token =
  | { type: 'names'; names: string[] }
  | { type: 'value'; value: string }
  | { type: 'function'; name: string; args: string }

function invalid(property: string, value: unknown): never {
  throw new Error(`Invalid value for CSS property "${property}": "${value}".`)
}

/** Splits a value into line names (`[a b]`), functions and other values. */
function tokenize(value: string, property: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < value.length) {
    if (/\s/.test(value[i])) {
      i++
    } else if (value[i] === '[') {
      const end = value.indexOf(']', i)
      if (end === -1) invalid(property, value)
      const names = value
        .slice(i + 1, end)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      tokens.push({ type: 'names', names })
      i = end + 1
    } else {
      let j = i
      while (j < value.length && !/[\s[()]/.test(value[j])) j++
      if (value[j] === '(') {
        let depth = 0
        let end = j
        for (; end < value.length; end++) {
          if (value[end] === '(') depth++
          else if (value[end] === ')' && --depth === 0) break
        }
        if (end === value.length) invalid(property, value)
        const name = value.slice(i, j).toLowerCase()
        tokens.push({ type: 'function', name, args: value.slice(j + 1, end) })
        i = end + 1
      } else {
        if (j === i) invalid(property, value)
        tokens.push({ type: 'value', value: value.slice(i, j) })
        i = j
      }
    }
  }
  return tokens
}

/** Splits function arguments by top-level commas. */
function splitArguments(args: string) {
  const result: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '(') depth++
    else if (args[i] === ')') depth--
    else if (args[i] === ',' && depth === 0) {
      result.push(args.slice(start, i).trim())
      start = i + 1
    }
  }
  result.push(args.slice(start).trim())
  return result
}

const NUMBER = String.raw`\+?(?:\d+\.?\d*|\.\d+)`

function parseBreadth(
  value: string,
  resolveLength: ResolveLength
): GridTrackBreadth | undefined {
  const normalized = value.trim().toLowerCase()
  if (
    normalized === 'auto' ||
    normalized === 'min-content' ||
    normalized === 'max-content'
  ) {
    return normalized
  }
  if (new RegExp(`^${NUMBER}fr$`).test(normalized)) {
    return `${parseFloat(normalized)}fr`
  }
  if (new RegExp(`^${NUMBER}%$`).test(normalized)) {
    return `${parseFloat(normalized)}%`
  }
  const length = resolveLength(normalized)
  if (length !== undefined && length >= 0) return length
}

const isFlex = (breadth: GridTrackBreadth) =>
  typeof breadth === 'string' && breadth.endsWith('fr')

function parseTrackSize(
  token: Token,
  resolveLength: ResolveLength
): GridTrackSize | undefined {
  if (token.type === 'value') {
    const breadth = parseBreadth(token.value, resolveLength)
    if (breadth === undefined) return
    // A flex fraction is `minmax(auto, <flex>)`.
    return { min: isFlex(breadth) ? 'auto' : breadth, max: breadth }
  }
  if (token.type !== 'function') return

  const args = splitArguments(token.args)
  if (token.name === 'minmax' && args.length === 2) {
    const min = parseBreadth(args[0], resolveLength)
    const max = parseBreadth(args[1], resolveLength)
    if (min === undefined || max === undefined || isFlex(min)) return
    return { min, max }
  }
  if (token.name === 'fit-content' && args.length === 1) {
    const limit = parseBreadth(args[0], resolveLength)
    if (
      typeof limit === 'number' ||
      (typeof limit === 'string' && limit.endsWith('%'))
    ) {
      return {
        min: 'auto',
        max: { fitContent: limit as number | `${number}%` },
      }
    }
  }
}

/** Parses tracks and the names of the lines between them. */
function parseTracks(
  tokens: Token[],
  resolveLength: ResolveLength,
  parseRepeat: ((args: string) => GridRepeat) | null,
  property: string,
  value: string
) {
  const tracks: (GridTrackSize | GridRepeat)[] = []
  const lineNames: string[][] = []
  let names: string[] = []
  let hasNames = false
  for (const token of tokens) {
    if (token.type === 'names') {
      names.push(...token.names)
      hasNames ||= token.names.length > 0
      continue
    }
    lineNames.push(names)
    names = []
    if (token.type === 'function' && token.name === 'repeat') {
      if (!parseRepeat) invalid(property, value)
      tracks.push(parseRepeat(token.args))
    } else {
      tracks.push(
        parseTrackSize(token, resolveLength) ?? invalid(property, value)
      )
    }
  }
  lineNames.push(names)
  if (!tracks.length) invalid(property, value)
  return { tracks, lineNames: hasNames ? lineNames : [] }
}

/**
 * `grid-template-columns` and `grid-template-rows`: `none`, or tracks with
 * line names.
 */
export function parseGridTrackList(
  value: string | number | undefined,
  resolveLength: ResolveLength,
  property: string
): GridTrackList | undefined {
  if (value === undefined) return
  if (typeof value === 'number') {
    if (value < 0) invalid(property, value)
    return { tracks: [{ min: value, max: value }], lineNames: [] }
  }
  const normalized = value.trim()
  if (normalized === 'none') return

  let autoRepeats = 0
  const parseRepeat = (args: string): GridRepeat => {
    const [count, ...rest] = splitArguments(args)
    const tracks = rest.join(',')
    const normalizedCount = count.toLowerCase()
    let repeatCount: GridRepeat['count']
    if (normalizedCount === 'auto-fill' || normalizedCount === 'auto-fit') {
      repeatCount = normalizedCount
      if (++autoRepeats > 1) invalid(property, value)
    } else if (/^\d+$/.test(normalizedCount) && +normalizedCount > 0) {
      repeatCount = +normalizedCount
    } else {
      invalid(property, value)
    }
    const repeated = parseTracks(
      tokenize(tracks, property),
      resolveLength,
      null,
      property,
      value
    )
    return {
      count: repeatCount,
      tracks: repeated.tracks as GridTrackSize[],
      lineNames: repeated.lineNames,
    }
  }

  return parseTracks(
    tokenize(normalized, property),
    resolveLength,
    parseRepeat,
    property,
    value
  )
}

/** `grid-auto-columns` and `grid-auto-rows`: track sizes. */
export function parseGridAutoTracks(
  value: string | number | undefined,
  resolveLength: ResolveLength,
  property: string
): GridTrackSize[] | undefined {
  if (value === undefined) return
  if (typeof value === 'number') {
    if (value < 0) invalid(property, value)
    return [{ min: value, max: value }]
  }
  return tokenize(value, property).map(
    (token) => parseTrackSize(token, resolveLength) ?? invalid(property, value)
  )
}

/** `grid-auto-flow`: `row` or `column`, and `dense`. */
export function parseGridAutoFlow(
  value: string | undefined
): 'row' | 'column' | 'row dense' | 'column dense' | undefined {
  if (value === undefined) return
  const words = value.trim().toLowerCase().split(/\s+/)
  const direction = words.filter((word) => word === 'row' || word === 'column')
  const dense = words.filter((word) => word === 'dense')
  if (
    direction.length > 1 ||
    dense.length > 1 ||
    direction.length + dense.length !== words.length
  ) {
    invalid('gridAutoFlow', value)
  }
  const axis = (direction[0] ?? 'row') as 'row' | 'column'
  return dense.length ? `${axis} dense` : axis
}

const isCustomIdent = (word: string) =>
  /^-?[_a-zA-Z][\w-]*$/.test(word) && word !== 'auto' && word !== 'span'

/**
 * `grid-row-start`, `grid-row-end`, `grid-column-start` and
 * `grid-column-end`: `auto`, `<integer> && <custom-ident>?` or
 * `span && [<integer> || <custom-ident>]`.
 */
export function parseGridLine(
  value: string | number | undefined,
  property: string
): GridLine | undefined {
  if (value === undefined) return
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value === 0) invalid(property, value)
    return { line: value }
  }
  const words = value.trim().split(/\s+/)
  if (words.length === 1 && words[0] === 'auto') return 'auto'

  let span = false
  let integer: number | undefined
  let name: string | undefined
  for (const word of words) {
    if (word === 'span' && !span) span = true
    else if (/^[+-]?\d+$/.test(word) && integer === undefined) {
      integer = parseInt(word, 10)
    } else if (isCustomIdent(word) && name === undefined) name = word
    else invalid(property, value)
  }
  if (span) {
    if (integer === undefined ? !name : integer <= 0) invalid(property, value)
    return { span: integer ?? 1, ...(name ? { name } : {}) }
  }
  if (integer === 0 || (integer === undefined && !name)) {
    invalid(property, value)
  }
  return { line: integer ?? 0, ...(name ? { name } : {}) }
}

/**
 * Expands `grid-row`, `grid-column` and `grid-area` into lines. Omitted end
 * lines are the start line if it's a name, and `auto` otherwise.
 */
export function expandGridPlacement(
  property: 'gridRow' | 'gridColumn' | 'gridArea',
  value: string | number
): Record<string, string | number> {
  const parts =
    typeof value === 'number' ? [value] : value.split('/').map((s) => s.trim())
  const maxParts = property === 'gridArea' ? 4 : 2
  if (parts.length > maxParts || parts.some((part) => part === '')) {
    invalid(property, value)
  }
  const fallback = (part: string | number | undefined) =>
    typeof part === 'string' && isCustomIdent(part) ? part : 'auto'

  if (property === 'gridArea') {
    const [rowStart, columnStart = fallback(rowStart)] = parts
    const [, , rowEnd = fallback(rowStart), columnEnd = fallback(columnStart)] =
      parts
    return {
      gridRowStart: rowStart,
      gridColumnStart: columnStart,
      gridRowEnd: rowEnd,
      gridColumnEnd: columnEnd,
    }
  }
  const [start, end = fallback(start)] = parts
  return { [`${property}Start`]: start, [`${property}End`]: end }
}

/** `grid-template-areas`: `none`, or a string for each row. */
export function parseGridTemplateAreas(
  value: string | undefined
): GridTemplateAreas | undefined {
  if (value === undefined || value.trim() === 'none') return
  const rows: string[][] = []
  const rest = value.replace(/"([^"]*)"|'([^']*)'/g, (_, double, single) => {
    rows.push((double ?? single).trim().split(/\s+/))
    return ''
  })
  const columnCount = rows[0]?.length ?? 0
  if (
    rest.trim() ||
    !columnCount ||
    rows.some((row) => row.length !== columnCount || row[0] === '')
  ) {
    invalid('gridTemplateAreas', value)
  }

  // The bounds of each named area, which must be filled rectangles.
  const bounds = new Map<string, number[]>()
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (/^\.+$/.test(cell)) return
      if (!isCustomIdent(cell)) invalid('gridTemplateAreas', value)
      const area = bounds.get(cell)
      if (!area) bounds.set(cell, [r, r, c, c])
      else {
        area[0] = Math.min(area[0], r)
        area[1] = Math.max(area[1], r)
        area[2] = Math.min(area[2], c)
        area[3] = Math.max(area[3], c)
      }
    })
  )
  for (const [name, [r0, r1, c0, c1]] of bounds) {
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (rows[r][c] !== name) invalid('gridTemplateAreas', value)
      }
    }
  }

  return {
    rowCount: rows.length,
    columnCount,
    areas: [...bounds].map(([name, [r0, r1, c0, c1]]) => ({
      name,
      rowStart: r0 + 1,
      rowEnd: r1 + 2,
      columnStart: c0 + 1,
      columnEnd: c1 + 2,
    })),
  }
}

type ShorthandToken =
  | { type: 'string'; value: string }
  | { type: 'slash' }
  | { type: 'value'; value: string }

/** Splits a value into strings, slashes and other values with line names. */
function tokenizeShorthand(value: string, property: string) {
  const tokens: ShorthandToken[] = []
  let i = 0
  while (i < value.length) {
    const char = value[i]
    if (/\s/.test(char)) {
      i++
    } else if (char === '"' || char === "'") {
      const end = value.indexOf(char, i + 1)
      if (end === -1) invalid(property, value)
      tokens.push({ type: 'string', value: value.slice(i + 1, end) })
      i = end + 1
    } else if (char === '/') {
      tokens.push({ type: 'slash' })
      i++
    } else {
      let j = i
      let depth = 0
      while (j < value.length) {
        if (value[j] === '(' || value[j] === '[') depth++
        else if (value[j] === ')' || value[j] === ']') depth--
        else if (depth === 0 && /[\s/"']/.test(value[j])) break
        j++
      }
      tokens.push({ type: 'value', value: value.slice(i, j) })
      i = j
    }
  }
  return tokens
}

const joinValues = (tokens: ShorthandToken[]) =>
  tokens.map((token) => (token as { value: string }).value).join(' ')

const isLineNames = (token: ShorthandToken | undefined) =>
  token?.type === 'value' && token.value.startsWith('[')

/**
 * Expands `grid-template`: `none`, `<rows> / <columns>`, or rows with the
 * strings of `grid-template-areas`, optionally followed by `/ <columns>`.
 */
export function expandGridTemplate(
  value: string,
  property = 'gridTemplate'
): Record<string, string> {
  const tokens = tokenizeShorthand(value.trim(), property)
  if (tokens.length === 1 && joinValues(tokens).toLowerCase() === 'none') {
    return {
      gridTemplateRows: 'none',
      gridTemplateColumns: 'none',
      gridTemplateAreas: 'none',
    }
  }
  const slash = tokens.findIndex((token) => token.type === 'slash')
  if (tokens.filter((token) => token.type === 'slash').length > 1) {
    invalid(property, value)
  }
  const before = slash === -1 ? tokens : tokens.slice(0, slash)
  const after = slash === -1 ? [] : tokens.slice(slash + 1)
  if (after.some((token) => token.type === 'string')) invalid(property, value)

  if (!before.some((token) => token.type === 'string')) {
    if (slash === -1 || !before.length || !after.length) {
      invalid(property, value)
    }
    return {
      gridTemplateRows: joinValues(before),
      gridTemplateColumns: joinValues(after),
      gridTemplateAreas: 'none',
    }
  }

  // `[<line-names>? <string> <track-size>? <line-names>?]+`
  const rows: string[] = []
  const areas: string[] = []
  let i = 0
  while (i < before.length) {
    if (isLineNames(before[i])) rows.push(joinValues([before[i++]]))
    const area = before[i++]
    if (area?.type !== 'string') invalid(property, value)
    areas.push(JSON.stringify((area as { value: string }).value))
    const size = before[i]
    if (size?.type === 'value' && !isLineNames(size)) {
      rows.push(size.value)
      i++
    } else {
      rows.push('auto')
    }
    if (isLineNames(before[i])) rows.push(joinValues([before[i++]]))
  }
  if (slash !== -1 && !after.length) invalid(property, value)
  return {
    gridTemplateRows: rows.join(' '),
    gridTemplateColumns: after.length ? joinValues(after) : 'none',
    gridTemplateAreas: areas.join(' '),
  }
}

/**
 * Expands `grid`: a `grid-template`, or `auto-flow` with implicit tracks on
 * one side of the slash and explicit tracks on the other.
 */
export function expandGrid(value: string): Record<string, string> {
  const tokens = tokenizeShorthand(value.trim(), 'grid')
  const slash = tokens.findIndex((token) => token.type === 'slash')
  const isAutoFlow = (token: ShorthandToken) =>
    token.type === 'value' && token.value.toLowerCase() === 'auto-flow'
  const autoFlowIndex = tokens.findIndex(isAutoFlow)
  const reset = { gridAutoRows: 'auto', gridAutoColumns: 'auto' }
  if (autoFlowIndex === -1) {
    return {
      ...expandGridTemplate(value, 'grid'),
      ...reset,
      gridAutoFlow: 'row',
    }
  }
  if (slash === -1 || tokens.filter((t) => t.type === 'slash').length > 1) {
    invalid('grid', value)
  }
  const rowFlow = autoFlowIndex < slash
  const side = rowFlow ? tokens.slice(0, slash) : tokens.slice(slash + 1)
  const other = rowFlow ? tokens.slice(slash + 1) : tokens.slice(0, slash)
  // `[auto-flow && dense?] <track-size>*`
  let dense = false
  let flowCount = 0
  let start = 0
  while (start < side.length && start < 2) {
    const token = side[start]
    if (isAutoFlow(token)) flowCount++
    else if (token.type === 'value' && token.value.toLowerCase() === 'dense') {
      dense = true
    } else break
    start++
  }
  const sizes = side.slice(start)
  if (
    flowCount !== 1 ||
    !other.length ||
    side.some((token) => token.type === 'string') ||
    sizes.some(isAutoFlow) ||
    other.some((token) => token.type === 'string' || isAutoFlow(token))
  ) {
    invalid('grid', value)
  }
  const implicit = sizes.length ? joinValues(sizes) : 'auto'
  return {
    gridTemplateRows: rowFlow ? 'none' : joinValues(other),
    gridTemplateColumns: rowFlow ? joinValues(other) : 'none',
    gridTemplateAreas: 'none',
    gridAutoFlow: (rowFlow ? 'row' : 'column') + (dense ? ' dense' : ''),
    gridAutoRows: rowFlow ? implicit : 'auto',
    gridAutoColumns: rowFlow ? 'auto' : implicit,
  }
}
