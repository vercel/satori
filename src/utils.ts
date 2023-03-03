import type { ReactNode, ReactElement } from 'react'

import CssDimension from './vendor/parse-css-dimension'
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
  if ('dangerouslySetInnerHTML' in props) {
    return true
  }
  return false
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
      switch (parsed.unit) {
        case 'deg':
          return parsed.value
        case 'rad':
          return (parsed.value * 180) / Math.PI
        default:
          return parsed.value
      }
    } else if (parsed.type === 'percentage') {
      if (percentage) {
        return (parsed.value / 100) * baseLength
      }
    }
  } catch {
    // Not a length unit, silently ignore.
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

    wordSegmenter = new (Intl as any).Segmenter(locale, { granularity: 'word' })
    graphemeSegmenter = new (Intl as any).Segmenter(locale, {
      granularity: 'grapheme',
    })
  }

  return granularity === 'word'
    ? [...wordSegmenter.segment(content)].map((seg) => seg.segment)
    : [...graphemeSegmenter.segment(content)].map((seg) => seg.segment)
}

export function buildXMLString(
  type: string,
  attrs: Record<string, any>,
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

  return {
    set,
    get,
  }
}

// Based on
// https://raw.githubusercontent.com/facebook/react/master/packages/react-dom/src/shared/possibleStandardNames.js
const ATTRIBUTE_MAPPING = {
  accentHeight: 'accent-height',
  alignmentBaseline: 'alignment-baseline',
  arabicForm: 'arabic-form',
  baselineShift: 'baseline-shift',
  capHeight: 'cap-height',
  clipPath: 'clip-path',
  clipRule: 'clip-rule',
  colorInterpolation: 'color-interpolation',
  colorInterpolationFilters: 'color-interpolation-filters',
  colorProfile: 'color-profile',
  colorRendering: 'color-rendering',
  dominantBaseline: 'dominant-baseline',
  enableBackground: 'enable-background',
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  floodColor: 'flood-color',
  floodOpacity: 'flood-opacity',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontSizeAdjust: 'font-size-adjust',
  fontStretch: 'font-stretch',
  fontStyle: 'font-style',
  fontVariant: 'font-variant',
  fontWeight: 'font-weight',
  glyphName: 'glyph-name',
  glyphOrientationHorizontal: 'glyph-orientation-horizontal',
  glyphOrientationVertical: 'glyph-orientation-vertical',
  horizAdvX: 'horiz-adv-x',
  horizOriginX: 'horiz-origin-x',
  imageRendering: 'image-rendering',
  letterSpacing: 'letter-spacing',
  lightingColor: 'lighting-color',
  markerEnd: 'marker-end',
  markerMid: 'marker-mid',
  markerStart: 'marker-start',
  overlinePosition: 'overline-position',
  overlineThickness: 'overline-thickness',
  paintOrder: 'paint-order',
  panose1: 'panose-1',
  pointerEvents: 'pointer-events',
  renderingIntent: 'rendering-intent',
  shapeRendering: 'shape-rendering',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  strikethroughPosition: 'strikethrough-position',
  strikethroughThickness: 'strikethrough-thickness',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeMiterlimit: 'stroke-miterlimit',
  strokeOpacity: 'stroke-opacity',
  strokeWidth: 'stroke-width',
  textAnchor: 'text-anchor',
  textDecoration: 'text-decoration',
  textRendering: 'text-rendering',
  underlinePosition: 'underline-position',
  underlineThickness: 'underline-thickness',
  unicodeBidi: 'unicode-bidi',
  unicodeRange: 'unicode-range',
  unitsPerEm: 'units-per-em',
  vAlphabetic: 'v-alphabetic',
  vHanging: 'v-hanging',
  vIdeographic: 'v-ideographic',
  vMathematical: 'v-mathematical',
  vectorEffect: 'vector-effect',
  vertAdvY: 'vert-adv-y',
  vertOriginX: 'vert-origin-x',
  vertOriginY: 'vert-origin-y',
  wordSpacing: 'word-spacing',
  writingMode: 'writing-mode',
  xHeight: 'x-height',
  xlinkActuate: 'xlink:actuate',
  xlinkArcrole: 'xlink:arcrole',
  xlinkHref: 'xlink:href',
  xlinkRole: 'xlink:role',
  xlinkShow: 'xlink:show',
  xlinkTitle: 'xlink:title',
  xlinkType: 'xlink:type',
  xmlBase: 'xml:base',
  xmlLang: 'xml:lang',
  xmlSpace: 'xml:space',
  xmlnsXlink: 'xmlns:xlink',
} as const

// From https://github.com/yoksel/url-encoder/blob/master/src/js/script.js
const SVGSymbols = /[\r\n%#()<>?[\\\]^`{|}"']/g

function translateSVGNodeToSVGString(
  node: ReactElement | string | (ReactElement | string)[],
  inheritedColor: string
): string {
  if (!node) return ''
  if (Array.isArray(node)) {
    return node
      .map((n) => translateSVGNodeToSVGString(n, inheritedColor))
      .join('')
  }
  if (typeof node !== 'object') return String(node)

  const type = node.type
  if (type === 'text') {
    throw new Error(
      '<text> nodes are not currently supported, please convert them to <path>'
    )
  }

  const { children, style, ...restProps } = node.props || {}
  const currentColor = style?.color || inheritedColor
  return `<${type}${Object.entries(restProps)
    .map(([k, _v]) => {
      if (typeof _v === 'string' && _v.toLowerCase() === 'currentcolor') {
        _v = currentColor
      }
      return ` ${ATTRIBUTE_MAPPING[k] || k}="${_v}"`
    })
    .join('')}>${translateSVGNodeToSVGString(children, currentColor)}</${type}>`
}

export function parseViewBox(viewBox?: string | null | undefined) {
  return viewBox ? viewBox.split(/[, ]/).filter(Boolean).map(Number) : null
}

export function SVGNodeToImage(
  node: ReactElement,
  inheritedColor: string
): string {
  let {
    viewBox,
    viewbox,
    width,
    height,
    className,
    style,
    children,
    ...restProps
  } = node.props || {}

  viewBox ||= viewbox

  // We directly assign the xmlns attribute here to deduplicate.
  restProps.xmlns = 'http://www.w3.org/2000/svg'

  const currentColor = style?.color || inheritedColor
  const viewBoxSize = parseViewBox(viewBox)

  // ratio = height / width
  const ratio = viewBoxSize ? viewBoxSize[3] / viewBoxSize[2] : null
  width = width || (ratio && height) ? height / ratio : null
  height = height || (ratio && width) ? width * ratio : null

  restProps.width = width
  restProps.height = height
  if (viewBox) restProps.viewBox = viewBox

  return `data:image/svg+xml;utf8,${`<svg ${Object.entries(restProps)
    .map(([k, _v]) => {
      if (typeof _v === 'string' && _v.toLowerCase() === 'currentcolor') {
        _v = currentColor
      }
      return ` ${ATTRIBUTE_MAPPING[k] || k}="${_v}"`
    })
    .join('')}>${translateSVGNodeToSVGString(
    children,
    currentColor
  )}</svg>`.replace(SVGSymbols, encodeURIComponent)}`
}

export function isString(x: unknown): x is string {
  return typeof x === 'string'
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
