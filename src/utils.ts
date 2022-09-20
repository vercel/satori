import type { ReactNode, ReactElement } from 'react'

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
  return /^class\s/.test(Function.prototype.toString.call(f))
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
  field: string | number,
  map: Record<string, any>,
  fallback: any
) {
  const value = map[field]
  return typeof value === 'undefined' ? fallback : value
}

// @TODO: Support "lang" attribute to modify the locale
const locale = undefined

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
  granularity: 'word' | 'grapheme'
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

  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v !== 'undefined') {
      attrString += ` ${k}="${v}"`
    }
  }

  if (children) {
    return `<${type}${attrString}>${children}</${type}>`
  }
  return `<${type}${attrString}/>`
}

export function createLRU<T>(max: number = 20) {
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
  allowReorder: 'allowreorder',
  arabicForm: 'arabic-form',
  attributeName: 'attributename',
  attributeType: 'attributetype',
  autoReverse: 'autoreverse',
  baseFrequency: 'basefrequency',
  baseProfile: 'baseprofile',
  baselineShift: 'baseline-shift',
  calcMode: 'calcmode',
  capHeight: 'cap-height',
  clipPath: 'clip-path',
  clipPathUnits: 'clippathunits',
  clipRule: 'clip-rule',
  colorInterpolation: 'color-interpolation',
  colorInterpolationFilters: 'color-interpolation-filters',
  colorProfile: 'color-profile',
  colorRendering: 'color-rendering',
  contentScriptType: 'contentscripttype',
  contentStyleType: 'contentstyletype',
  diffuseConstant: 'diffuseconstant',
  dominantBaseline: 'dominant-baseline',
  edgeMode: 'edgemode',
  enableBackground: 'enable-background',
  externalResourcesRequired: 'externalresourcesrequired',
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  filterRes: 'filterres',
  filterUnits: 'filterunits',
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
  glyphRef: 'glyphref',
  gradientTransform: 'gradienttransform',
  gradientUnits: 'gradientunits',
  horizAdvX: 'horiz-adv-x',
  horizOriginX: 'horiz-origin-x',
  imageRendering: 'image-rendering',
  kernelMatrix: 'kernelmatrix',
  kernelUnitLength: 'kernelunitlength',
  keyPoints: 'keypoints',
  keySplines: 'keysplines',
  keyTimes: 'keytimes',
  lengthAdjust: 'lengthadjust',
  letterSpacing: 'letter-spacing',
  lightingColor: 'lighting-color',
  limitingConeAngle: 'limitingconeangle',
  markerEnd: 'marker-end',
  markerHeight: 'markerheight',
  markerMid: 'marker-mid',
  markerStart: 'marker-start',
  markerUnits: 'markerunits',
  markerWidth: 'markerwidth',
  maskContentUnits: 'maskcontentunits',
  maskUnits: 'maskunits',
  numOctaves: 'numoctaves',
  overlinePosition: 'overline-position',
  overlineThickness: 'overline-thickness',
  paintOrder: 'paint-order',
  panose1: 'panose-1',
  pathLength: 'pathlength',
  patternContentUnits: 'patterncontentunits',
  patternTransform: 'patterntransform',
  patternUnits: 'patternunits',
  pointerEvents: 'pointer-events',
  pointsAtX: 'pointsatx',
  pointsAtY: 'pointsaty',
  pointsAtZ: 'pointsatz',
  preserveAlpha: 'preservealpha',
  preserveAspectRatio: 'preserveaspectratio',
  primitiveUnits: 'primitiveunits',
  refX: 'refx',
  refY: 'refy',
  renderingIntent: 'rendering-intent',
  repeatCount: 'repeatcount',
  repeatDur: 'repeatdur',
  requiredExtensions: 'requiredextensions',
  requiredFeatures: 'requiredfeatures',
  shapeRendering: 'shape-rendering',
  specularConstant: 'specularconstant',
  specularExponent: 'specularexponent',
  spreadMethod: 'spreadmethod',
  startOffset: 'startoffset',
  stdDeviation: 'stddeviation',
  stitchTiles: 'stitchtiles',
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
  suppressContentEditableWarning: 'suppresscontenteditablewarning',
  suppressHydrationWarning: 'suppresshydrationwarning',
  surfaceScale: 'surfacescale',
  systemLanguage: 'systemlanguage',
  tableValues: 'tablevalues',
  targetX: 'targetx',
  targetY: 'targety',
  textAnchor: 'text-anchor',
  textDecoration: 'text-decoration',
  textLength: 'textlength',
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
  viewBox: 'viewbox',
  viewTarget: 'viewtarget',
  wordSpacing: 'word-spacing',
  writingMode: 'writing-mode',
  xChannelSelector: 'xchannelselector',
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
  xmlSpace: 'xmlspace',
  xmlnsXlink: 'xmlns:xlink',
  yChannelSelector: 'ychannelselector',
  zoomAndPan: 'zoomandpan',
}

// From https://github.com/yoksel/url-encoder/blob/master/src/js/script.js
const SVGSymbols = /[\r\n%#()<>?[\\\]^`{|}"']/g

function translateSVGNodeToSVGString(
  node: ReactElement | string | (ReactElement | string)[]
): string {
  if (!node) return ''
  if (Array.isArray(node)) {
    return node.map(translateSVGNodeToSVGString).join('')
  }
  if (typeof node !== 'object') return String(node)

  const type = node.type
  if (type === 'text') {
    throw new Error(
      '<text> nodes are not currently supported, please convert them to <path>'
    )
  }

  const { children, ...restProps } = node.props || {}
  return `<${type}${Object.entries(restProps)
    .map(([k, v]) => {
      return ` ${ATTRIBUTE_MAPPING[k] || k}="${v}"`
    })
    .join('')}>${translateSVGNodeToSVGString(children)}</${type}>`
}

export function SVGNodeToImage(node: ReactElement): string {
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
  const viewBoxSize = viewBox.split(' ').map((v) => parseInt(v, 10))

  // We directly assign the xmlns attribute here to deduplicate.
  restProps.xmlns = 'http://www.w3.org/2000/svg'
  restProps.viewBox = viewBox
  restProps.width = viewBoxSize[2]
  restProps.height = viewBoxSize[3]

  return `data:image/svg+xml;utf8,${`<svg${Object.entries(restProps)
    .map(([k, v]) => {
      return ` ${ATTRIBUTE_MAPPING[k] || k}="${v}"`
    })
    .join('')}>${translateSVGNodeToSVGString(children)}</svg>`.replace(
    SVGSymbols,
    encodeURIComponent
  )}`
}
