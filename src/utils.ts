import type { ReactNode, ReactElement } from 'react'

import CssDimension from './vendor/parse-css-dimension/index.js'
import LineBreaker from 'linebreak'

export function isReactElement(node: ReactNode): node is ReactElement {
  const type = typeof node
  if (
    type === 'number' ||
    type === 'bigint' ||
    type === 'string' ||
    type === 'boolean'
  ) {
    return false
  }
  return true
}

export function isClass(f: Function) {
  return /^class\s/.test(f.toString())
}

export function hasDangerouslySetInnerHTMLProp(props: any) {
  return 'dangerouslySetInnerHTML' in props
}

export function normalizeChildren(children: any) {
  const flattend =
    typeof children === 'undefined' ? [] : [].concat(children).flat(Infinity)

  const res = []
  for (let i = 0; i < flattend.length; i++) {
    let value = flattend[i]
    if (
      typeof value === 'undefined' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      continue
    }
    if (typeof value === 'number') {
      value = String(value)
    }
    if (
      typeof value === 'string' &&
      res.length &&
      typeof res[res.length - 1] === 'string'
    ) {
      res[res.length - 1] += value
    } else {
      res.push(value)
    }
  }
  return res
}

export function lengthToNumber(
  length: string | number,
  baseFontSize: number,
  baseLength: number,
  inheritedStyle: Record<string, string | number>,
  percentage = false
): number | undefined {
  if (typeof length === 'number') return length

  // Convert em and rem values to number (px), convert rad to deg.
  try {
    length = length.trim()

    // Not length: `1px/2px`, `1px 2px`, `1px, 2px`, `calc(1px)`.
    if (/[ /\(,]/.test(length)) return

    // Just a number as string: '100'
    if (length === String(+length)) return +length

    const parsed = new CssDimension(length)
    if (parsed.type === 'length') {
      switch (parsed.unit) {
        case 'em':
          return parsed.value * baseFontSize
        case 'rem':
          return parsed.value * 16
        case 'vw':
          return ~~(
            (parsed.value * (inheritedStyle._viewportWidth as number)) /
            100
          )
        case 'vh':
          return ~~(
            (parsed.value * (inheritedStyle._viewportHeight as number)) /
            100
          )
        default:
          return parsed.value
      }
    } else if (parsed.type === 'angle') {
      return calcDegree(length)
    } else if (parsed.type === 'percentage') {
      if (percentage) {
        return (parsed.value / 100) * baseLength
      }
    }
  } catch {
    // Not a length unit, silently ignore.
  }
}

export function calcDegree(deg: string) {
  const parsed = new CssDimension(deg)

  switch (parsed.unit) {
    case 'deg':
      return parsed.value
    case 'rad':
      return (parsed.value * 180) / Math.PI
    case 'turn':
      return parsed.value * 360
    case 'grad':
      return 0.9 * parsed.value
  }
}

// Multiplies two 2d transform matrices.
export function multiply(m1: number[], m2: number[]) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ]
}

export function v(
  field: string | number | undefined,
  map: Record<string, any>,
  fallback: any,
  errorIfNotAllowedForProperty?: string
) {
  let value = map[field]
  if (typeof value === 'undefined') {
    if (errorIfNotAllowedForProperty && typeof field !== 'undefined') {
      throw new Error(
        `Invalid value for CSS property "${errorIfNotAllowedForProperty}". Allowed values: ${Object.keys(
          map
        )
          .map((_v) => `"${_v}"`)
          .join(' | ')}. Received: "${field}".`
      )
    }
    value = fallback
  }
  return value
}

let wordSegmenter
let graphemeSegmenter

// Implementation modified from
// https://github.com/niklasvh/html2canvas/blob/6521a487d78172f7179f7c973c1a3af40eb92009/src/css/layout/text.ts
// https://drafts.csswg.org/css-text/#word-separator
export const wordSeparators = [
  0x0020, 0x00a0, 0x1361, 0x10100, 0x10101, 0x1039, 0x1091, 0xa,
].map((point) => String.fromCodePoint(point))

export function segment(
  content: string,
  granularity: 'word' | 'grapheme',
  locale?: string
): string[] {
  if (!wordSegmenter || !graphemeSegmenter) {
    if (!(typeof Intl !== 'undefined' && 'Segmenter' in Intl)) {
      // https://caniuse.com/mdn-javascript_builtins_intl_segments
      throw new Error(
        'Intl.Segmenter does not exist, please use import a polyfill.'
      )
    }

    wordSegmenter = new Intl.Segmenter(locale, { granularity: 'word' })
    graphemeSegmenter = new Intl.Segmenter(locale, {
      granularity: 'grapheme',
    })
  }

  if (granularity === 'grapheme') {
    return [...graphemeSegmenter.segment(content)].map((seg) => seg.segment)
  }
  const segmented = [...wordSegmenter.segment(content)].map(
    (seg) => seg.segment
  ) as string[]

  const output = []

  let i = 0
  // When there is a non-breaking space, join the previous and next words together.
  // This change causes them to be treated as a single segment.
  while (i < segmented.length) {
    const s = segmented[i]

    if (s == '\u00a0') {
      const previousWord = i === 0 ? '' : output.pop()
      const nextWord = i === segmented.length - 1 ? '' : segmented[i + 1]

      output.push(`${previousWord}\u00a0${nextWord}`)
      i += 2
    } else {
      output.push(s)
      i++
    }
  }

  return output
}

export function buildXMLString(
  type: string,
  attrs: Record<string, string | number>,
  children?: string
) {
  let attrString = ''

  for (const [k, _v] of Object.entries(attrs)) {
    if (typeof _v !== 'undefined') {
      attrString += ` ${k}="${_v}"`
    }
  }

  if (children) {
    return `<${type}${attrString}>${children}</${type}>`
  }
  return `<${type}${attrString}/>`
}

export function createLRU<T>(max = 20) {
  const store: Map<string, T> = new Map()
  function set(key: string, value: T) {
    if (store.size >= max) {
      const keyToDelete = store.keys().next().value
      store.delete(keyToDelete)
    }
    store.set(key, value)
  }
  function get(key: string): T | undefined {
    const hasKey = store.has(key)
    if (!hasKey) return undefined

    const entry = store.get(key)!
    store.delete(key)
    store.set(key, entry)
    return entry
  }
  function clear() {
    store.clear()
  }

  return {
    set,
    get,
    clear,
  }
}

export function parseViewBox(viewBox?: string | null | undefined) {
  return viewBox ? viewBox.split(/[, ]/).filter(Boolean).map(Number) : null
}

export function toString(x: unknown): string {
  return Object.prototype.toString.call(x)
}

export function isString(x: unknown): x is string {
  return typeof x === 'string'
}

export function isNumber(x: unknown): x is number {
  return typeof x === 'number'
}

export function isUndefined(x: unknown): x is undefined {
  return toString(x) === '[object Undefined]'
}

export function splitByBreakOpportunities(
  content: string,
  wordBreak: string
): {
  words: string[]
  requiredBreaks: boolean[]
} {
  if (wordBreak === 'break-all') {
    return { words: segment(content, 'grapheme'), requiredBreaks: [] }
  }

  if (wordBreak === 'keep-all') {
    return { words: segment(content, 'word'), requiredBreaks: [] }
  }

  const contentWithoutStartEnd = content
    .replace(/\[s(?:\]|\s*:\s*\{.*?\}\s*\])/g, '')
    .replace(/\[e(?:\]|\s*:\e*\{.*?\}\e*\])/g, '')

  const breaker = new LineBreaker(contentWithoutStartEnd)
  let last = 0
  let bk = breaker.nextBreak()
  const words = []
  const requiredBreaks = [false]

  while (bk) {
    const word = contentWithoutStartEnd.slice(last, bk.position)
    words.push(word)

    if (bk.required) {
      requiredBreaks.push(true)
    } else {
      requiredBreaks.push(false)
    }

    last = bk.position
    bk = breaker.nextBreak()
  }

  return { words, requiredBreaks }
}

export const midline = (s: string) => {
  return s.replaceAll(
    /([A-Z])/g,
    (_, letter: string) => `-${letter.toLowerCase()}`
  )
}

export function splitEffects(
  input: string,
  separator: string | RegExp = ','
): string[] {
  const result = []
  let l = 0
  let parenCount = 0
  separator = new RegExp(separator)

  for (let i = 0; i < input.length; i++) {
    if (input[i] === '(') {
      parenCount++
    } else if (input[i] === ')') {
      parenCount--
    }

    if (parenCount === 0 && separator.test(input[i])) {
      result.push(input.slice(l, i).trim())
      l = i + 1
    }
  }

  result.push(input.slice(l).trim())

  return result
}

export function getHighlightedOptions(
  originalContent: string
): { start: number; end: number; options: Record<string, any> }[] {
  type Highlight = { start: number; end: number; options: Record<string, any> }
  const result: Highlight[] = []
  const stack: { start: number; options: Record<string, any> }[] = []

  let i = 0 // position in the original string
  let visible = 0 // position in the rendered text (tags removed)

  while (i < originalContent.length) {
    // -----------  [s:{ … }]  --------------------------------------------
    if (originalContent.startsWith('[s:{', i)) {
      const close = originalContent.indexOf(']', i)
      const raw = originalContent.slice(i + 3, close).trim() // after "[s:"
      let options: Record<string, any> = {}

      try {
        options = JSON.parse(raw)
      } catch {
        /* ignore parse errors */
      }

      stack.push({ start: visible, options })
      i = close + 1
      continue
    }

    // -----------  [s]  ---------------------------------------------------
    if (originalContent.startsWith('[s]', i)) {
      stack.push({ start: visible, options: {} })
      i += 3
      continue
    }

    if (originalContent.startsWith('[e:{', i)) {
      const close = originalContent.indexOf(']', i)
      const raw = originalContent.slice(i + 3, close).trim() // after "[s:"
      let options: Record<string, any> = {}

      try {
        options = JSON.parse(raw)
      } catch {
        /* ignore parse errors */
      }
      if (stack.length) {
        const index = stack.findIndex((e) => e.options.id == options['id'])
        const value = stack[index]
        if (value) {
          stack.splice(index, 1)
          result.push({
            start: value.start,
            end: visible,
            options: value.options,
          })
        } else {
          const shifted = stack.shift()
          result.push({
            start: shifted.start,
            end: visible,
            options: shifted.options,
          })
        }
      }

      i = close + 1
      continue
    }

    // -----------  [e]  ---------------------------------------------------
    if (originalContent.startsWith('[e]', i)) {
      if (stack.length) {
        const value = stack.shift()
        result.push({
          start: value.start,
          end: visible,
          options: value.options,
        })
      }
      i += 3
      continue
    }

    // -----------  normal character  --------------------------------------
    visible++
    i++
  }

  // Return highlights ordered by their starting index
  return result.sort((a, b) => a.start - b.start)
}

/**
 * Converts character–based highlight ranges to a map whose keys are `words`
 * indices and whose values are the corresponding `options`.
 *
 * * If the word touched by `start` **or** the word touched by `end` is a blank
 *   token (`words[i].trim() === ''`) that particular index is dropped.
 * * Later items in `highlights` win whenever two ranges overlap.
 * * Ranges whose `options` object is empty (`{}`) are ignored.
 */
export function buildHighlightMap(
  highlights: { start: number; end: number; options: Record<string, any> }[],
  words: string[]
): Record<number, Record<string, unknown>> {
  /* ---------- 1 . word-start lookup table (prefix-sum) ---------- */
  const prefix: number[] = [0]
  for (let i = 0; i < words.length; i++) {
    prefix[i + 1] = prefix[i] + words[i].length
  }

  // binary-search “character → word” (O(log n))
  const charToWord = (ch: number): number => {
    let lo = 0,
      hi = words.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1
      if (ch < prefix[mid]) hi = mid - 1
      else if (ch >= prefix[mid + 1]) lo = mid + 1
      else return mid
    }
    throw new RangeError(`Character index ${ch} is outside the text`)
  }

  /* ---------- 2 . iterate ranges, later ones overwrite ---------- */
  const result: Record<number, Record<string, unknown>> = {}

  for (const { start, end, options } of highlights) {
    // ignore ranges whose option bag is empty
    const first = charToWord(start)
    const last = charToWord(end) // `end` is *inclusive*

    // build [first … last] and trim blank tokens at both ends
    let from = first
    let to = last
    if (words[from].trim() === '') from++
    if (from <= to && words[to].trim() === '') to--

    for (let i = from; i <= to; i++) {
      result[i] = options // later ranges overwrite earlier ones
    }
  }

  return result
}
