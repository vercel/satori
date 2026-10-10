import type { ReactNode, ReactElement } from 'react'
import escapeHTML from 'escape-html'
import LineBreaker from 'linebreak'

import CssDimension from './vendor/parse-css-dimension/index.js'
import type { CalcLength, Size } from './layout-engine/node.js'

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

export function isForwardRefComponent(type: any) {
  return type && type.$$typeof === Symbol.for('react.forward_ref')
}

export function isReactComponent(type: any) {
  return typeof type === 'function' || isForwardRefComponent(type)
}

export function hasDangerouslySetInnerHTMLProp(props: any) {
  return 'dangerouslySetInnerHTML' in props
}

const REACT_FRAGMENT = Symbol.for('react.fragment')

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
    // Fragments are replaced by their children.
    if (value?.type === REACT_FRAGMENT) {
      flattend.splice(i + 1, 0, ...normalizeChildren(value.props?.children))
      continue
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

// A number with an optional unit, e.g. `10px`, `-.5em` or `50%`.
const DIMENSION = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z]*|%)$/i

// Absolute lengths in px: https://www.w3.org/TR/css-values-4/#absolute-lengths
const ABSOLUTE_LENGTHS: Record<string, number> = {
  px: 1,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
  pt: 96 / 72,
  pc: 16,
}

const ANGLES = new Set(['deg', 'rad', 'turn', 'grad'])

/**
 * Converts a length to px, or an angle to degrees. Percentages are of
 * `baseLength` if `percentage` is set. Returns `undefined` for other values.
 */
export function lengthToNumber(
  length: string | number,
  baseFontSize: number,
  baseLength: number,
  inheritedStyle: Record<string, string | number>,
  percentage = false
): number | undefined {
  if (typeof length === 'number') return length
  if (typeof length !== 'string') return

  const match = DIMENSION.exec(length.trim())
  if (!match) return

  const value = parseFloat(match[1])
  const unit = match[2].toLowerCase()
  if (!unit) return value
  if (unit in ABSOLUTE_LENGTHS) return value * ABSOLUTE_LENGTHS[unit]

  const viewportWidth = inheritedStyle._viewportWidth as number
  const viewportHeight = inheritedStyle._viewportHeight as number
  switch (unit) {
    case 'em':
      return value * baseFontSize
    case 'rem':
      return value * 16
    // The x-height and the width of `0` are about half the font size.
    case 'ex':
    case 'ch':
      return value * baseFontSize * 0.5
    case 'vw':
      return ~~((value * viewportWidth) / 100)
    case 'vh':
      return ~~((value * viewportHeight) / 100)
    case 'vmin':
      return ~~((value * Math.min(viewportWidth, viewportHeight)) / 100)
    case 'vmax':
      return ~~((value * Math.max(viewportWidth, viewportHeight)) / 100)
    case '%':
      return percentage ? (value / 100) * baseLength : undefined
  }
  if (ANGLES.has(unit)) return calcDegree(value + unit)
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

// Implementation modified from
// https://github.com/niklasvh/html2canvas/blob/6521a487d78172f7179f7c973c1a3af40eb92009/src/css/layout/text.ts
// https://drafts.csswg.org/css-text/#word-separator
export const wordSeparators = [
  0x0020, 0x00a0, 0x1361, 0x10100, 0x10101, 0x1039, 0x1091, 0xa,
].map((point) => String.fromCodePoint(point))

const segmenters = new Map<string, Intl.Segmenter>()

function getSegmenter(granularity: 'word' | 'grapheme', locale?: string) {
  const key = `${granularity}:${locale || ''}`
  let segmenter = segmenters.get(key)
  if (!segmenter) {
    if (!(typeof Intl !== 'undefined' && 'Segmenter' in Intl)) {
      // https://caniuse.com/mdn-javascript_builtins_intl_segments
      throw new Error(
        'Intl.Segmenter does not exist, please use import a polyfill.'
      )
    }
    try {
      segmenter = new Intl.Segmenter(locale, { granularity })
    } catch {
      // An invalid locale.
      segmenter = new Intl.Segmenter(undefined, { granularity })
    }
    segmenters.set(key, segmenter)
  }
  return segmenter
}

// Segments by granularity and locale, then by content. Looking up the content
// directly avoids building a key from it.
const segmentCaches = new Map<string, Map<string, string[]>>()
const MAX_SEGMENT_CACHE_SIZE = 500

export function segment(
  content: string,
  granularity: 'word' | 'grapheme',
  locale?: string
): string[] {
  const cacheKey = `${granularity}:${locale || ''}`
  let cache = segmentCaches.get(cacheKey)
  if (!cache) {
    cache = new Map()
    segmentCaches.set(cacheKey, cache)
  }
  const cached = cache.get(content)
  if (cached) return cached

  let result: string[]

  if (granularity === 'grapheme') {
    result = [...getSegmenter('grapheme', locale).segment(content)].map(
      (seg) => seg.segment
    )
  } else {
    const segmented = [...getSegmenter('word', locale).segment(content)].map(
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

        output.push(previousWord + '\u00a0' + nextWord)
        i += 2
      } else {
        output.push(s)
        i++
      }
    }

    result = output
  }

  if (cache.size >= MAX_SEGMENT_CACHE_SIZE) {
    cache.delete(cache.keys().next().value)
  }
  cache.set(content, result)
  return result
}

/** Build safe SVG markup from element names, attributes, and serialized children. */
export function buildXMLString(
  type: string,
  attrs: Record<string, unknown>,
  children?: string
) {
  assertValidXMLName(type, 'element')
  let attrString = ''

  for (const [k, _v] of Object.entries(attrs)) {
    if (typeof _v !== 'undefined') {
      assertValidXMLName(k, 'attribute')
      attrString += ` ${k}="${escapeXMLAttribute(_v)}"`
    }
  }

  if (children) {
    return `<${type}${attrString}>${children}</${type}>`
  }
  return `<${type}${attrString}/>`
}

// Mirrors React's XML-compatible attribute-name validation. Names cannot be
// escaped, so validate them before interpolating them into markup.
const XML_NAME_START_CHAR =
  ':A-Z_a-z\\u00C0-\\u00D6' +
  '\\u00D8-\\u00F6\\u00F8-\\u02FF' +
  '\\u0370-\\u037D\\u037F-\\u1FFF' +
  '\\u200C-\\u200D\\u2070-\\u218F' +
  '\\u2C00-\\u2FEF\\u3001-\\uD7FF' +
  '\\uF900-\\uFDCF\\uFDF0-\\uFFFD'
const XML_NAME_CHAR =
  XML_NAME_START_CHAR + '\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040'
// Combining marks are valid in XML names after the first character.
// eslint-disable-next-line no-misleading-character-class
const VALID_XML_NAME = new RegExp(
  '^[' + XML_NAME_START_CHAR + '][' + XML_NAME_CHAR + ']*$',
  'u'
)
const validatedXMLNames = new Set<string>()

export function assertValidXMLName(
  name: string,
  kind: 'element' | 'attribute'
) {
  if (validatedXMLNames.has(name)) return
  if (!VALID_XML_NAME.test(name)) {
    throw new Error(`Invalid XML ${kind} name: ${JSON.stringify(name)}`)
  }
  validatedXMLNames.add(name)
}

export function escapeXMLAttribute(value: unknown): string {
  if (
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
  ) {
    return '' + value
  }
  return escapeHTML(String(value))
}

export function escapeXMLText(value: unknown): string {
  return escapeHTML(String(value))
}

export function createLRU<T>(max = 20) {
  const store: Map<string, T> = new Map()
  function get(key: string): T | undefined {
    const value = store.get(key)
    if (value === undefined) return undefined

    // Move to end (most recently used)
    store.delete(key)
    store.set(key, value)
    return value
  }
  function set(key: string, value: T) {
    if (store.has(key)) {
      store.delete(key)
    } else if (store.size >= max) {
      const firstKey = store.keys().next().value
      store.delete(firstKey)
    }

    store.set(key, value)
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
  return typeof x === 'undefined'
}

export function asPointPercentageLength(
  x: string | number | CalcLength,
  propertyName?: string
): number | `${number}%` | CalcLength | undefined {
  if (typeof x === 'number' || typeof x === 'object') {
    return x
  }
  if (x.endsWith('%')) {
    const percentageValue = parseFloat(x.slice(0, -1))
    if (isNaN(percentageValue)) {
      console.warn(
        `Invalid value "${x}"${
          typeof propertyName === 'string' ? ` for "${propertyName}"` : ''
        }. Expected a percentage value (e.g., "50%").`
      )
      return undefined
    }
    return `${percentageValue}%`
  }

  console.warn(
    `Invalid value "${x}"${
      typeof propertyName === 'string' ? ` for "${propertyName}"` : ''
    }. Expected a number or a percentage value (e.g., "50%").`
  )
  return undefined
}

const SIZING_KEYWORDS = {
  'min-content': 'min-content',
  'max-content': 'max-content',
  'fit-content': 'fit-content',
  stretch: 'stretch',
  // Prefixed aliases, like in Chrome.
  '-webkit-min-content': 'min-content',
  '-webkit-max-content': 'max-content',
  '-webkit-fit-content': 'fit-content',
  '-webkit-fill-available': 'stretch',
} as const

/**
 * A size of `width`, `height`, their minimums and maximums, or `flexBasis`: a
 * length, or a sizing keyword. `content` is only a flex basis, and `auto`
 * isn't a minimum or maximum.
 */
export function asSize(
  x: string | number | CalcLength,
  propertyName: string
): Size | undefined {
  if (typeof x === 'string') {
    const value = x.trim().toLowerCase()
    if (value in SIZING_KEYWORDS) return SIZING_KEYWORDS[value]
    if (value === 'content' && propertyName === 'flexBasis') return 'content'
    const fitContent = /^fit-content\(\s*([\d.]+)(px|%)\s*\)$/.exec(value)
    if (fitContent) {
      const limit = parseFloat(fitContent[1])
      return { fitContent: fitContent[2] === '%' ? `${limit}%` : limit }
    }
  }
  return /^(min|max)/.test(propertyName)
    ? asPointPercentageLength(x, propertyName)
    : asPointAutoPercentageLength(x, propertyName)
}

export function asPointAutoPercentageLength(
  x: string | number | CalcLength,
  propertyName?: string
): number | 'auto' | `${number}%` | CalcLength | undefined {
  if (typeof x === 'number' || typeof x === 'object') {
    return x
  }
  if (x === 'auto') {
    return 'auto'
  }
  if (x.endsWith('%')) {
    const percentageValue = parseFloat(x.slice(0, -1))
    if (isNaN(percentageValue)) {
      console.warn(
        `Invalid value "${x}"${
          typeof propertyName === 'string' ? ` for "${propertyName}"` : ''
        }. Expected a percentage value (e.g., "50%").`
      )
      return undefined
    }
    return `${percentageValue}%`
  }

  console.warn(
    `Invalid value "${x}"${
      typeof propertyName === 'string' ? ` for "${propertyName}"` : ''
    }. Expected a number, "auto", or a percentage value (e.g., "50%").`
  )
  return undefined
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

  const breaker = new LineBreaker(content)
  let last = 0
  let bk = breaker.nextBreak()
  const words = []
  const requiredBreaks = [false]

  while (bk) {
    const word = content.slice(last, bk.position)
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
