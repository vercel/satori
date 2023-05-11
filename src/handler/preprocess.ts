import type { ReactElement, ReactNode } from 'react'
import { resolveImageData, cache } from './image.js'
import { isReactElement, parseViewBox, midline } from '../utils.js'

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
  href: 'href',
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

  const attrs = `${Object.entries(restProps)
    .map(([k, _v]) => {
      if (typeof _v === 'string' && _v.toLowerCase() === 'currentcolor') {
        _v = currentColor
      }

      if (k === 'href' && type === 'image') {
        return ` ${ATTRIBUTE_MAPPING[k] || k}="${cache.get(_v as string)[0]}"`
      }
      return ` ${ATTRIBUTE_MAPPING[k] || k}="${_v}"`
    })
    .join('')}`

  const styles = style
    ? ` style="${Object.entries(style)
        .map(([k, _v]) => `${midline(k)}:${_v}`)
        .join(';')}"`
    : ''

  return `<${type}${attrs}${styles}>${translateSVGNodeToSVGString(
    children,
    currentColor
  )}</${type}>`
}
/**
 * pre process node and resolve absolute link to img data for image element
 * @param node ReactNode
 * @returns
 */
export async function preProcessNode(node: ReactNode) {
  const set = new Set<string | Buffer | ArrayBuffer>()
  const walk = (_node: ReactNode) => {
    if (!_node) return
    if (!isReactElement(_node)) return

    if (Array.isArray(_node)) {
      _node.forEach((v) => walk(v))
      return
    } else if (typeof _node === 'object') {
      if (_node.type === 'image') {
        if (set.has(_node.props.href)) {
          // do nothing
        } else {
          set.add(_node.props.href)
        }
      } else if (_node.type === 'img') {
        if (set.has(_node.props.src)) {
          // do nothing
        } else {
          set.add(_node.props.src)
        }
      } else {
        // do nothing
      }
    }

    Array.isArray(_node.props.children)
      ? _node.props.children.map((c) => walk(c))
      : walk(_node.props.children)
  }

  walk(node)

  return Promise.all(Array.from(set).map((s) => resolveImageData(s)))
}

export async function SVGNodeToImage(
  node: ReactElement,
  inheritedColor: string
): Promise<string> {
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
