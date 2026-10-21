import type { ReactElement, ReactNode, Fragment } from 'react'
import { Fragment as FragmentSymbol } from '../jsx/jsx-runtime.js'
import { resolveImageData, cache } from './image.js'
import { convertColors as convertColorValues } from '../parser/color.js'
import {
  extractCustomProperties,
  mergeVariables,
  resolveVariables,
  type CSSVariables,
} from './variables.js'
import {
  buildXMLString,
  escapeXMLText,
  isReactElement,
  parseViewBox,
  midline,
} from '../utils.js'

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

// The original characters make SVG suitable for a data URL. Ampersands are
// additionally encoded so inner XML entities survive the enclosing SVG parse.
const EMBEDDED_SVG_DATA_URL_SYMBOLS = /[\r\n%#()<>?[\\\]^`{|}"'&]/g

/**
 * Resolves `currentColor` in an attribute or style value, and converts colors
 * that SVG renderers may not support.
 */
function resolveSVGColors(
  value: unknown,
  currentColor: string,
  convertColors: boolean
) {
  if (typeof value !== 'string') return value
  if (value.toLowerCase() === 'currentcolor') return currentColor
  return convertColors ? convertColorValues(value, currentColor) : value
}

/**
 * After `z`, a command other than a move starts a subpath where the closed one
 * started, which resvg can't parse: it panics and ends the process. `m0 0`
 * moves to that point first, which doesn't change the path.
 */
function normalizePathData(data: string) {
  return data.replace(/[zZ](?=\s*[a-ln-yA-LN-Y])/g, '$&m0 0')
}

/**
 * Resolves `var()` in an attribute or style value, like browsers do for
 * presentation attributes. A value that is invalid then is `undefined`, and
 * left out.
 */
function resolveSVGVariables(value: unknown, variables: CSSVariables) {
  if (typeof value !== 'string' || !value.includes('var(')) return value
  const resolved = resolveVariables(value, variables)
  return typeof resolved === 'string' && !resolved.trim() ? undefined : resolved
}

/** The variables of an element of an SVG, with the inherited ones. */
function getSVGVariables(style: unknown, inherited: CSSVariables) {
  if (!style || typeof style !== 'object') return inherited
  const { variables } = extractCustomProperties(
    style as Record<string, string | number>
  )
  return Object.keys(variables).length
    ? mergeVariables(inherited, variables)
    : inherited
}

function translateSVGNodeToSVGString(
  node:
    | ReactElement
    | string
    | typeof Fragment
    | (ReactElement | string | typeof Fragment)[],
  inheritedColor: string,
  convertColors: boolean,
  inheritedVariables: CSSVariables = {}
): string {
  if (!node) return ''
  if (Array.isArray(node)) {
    return node
      .map((n) =>
        translateSVGNodeToSVGString(
          n,
          inheritedColor,
          convertColors,
          inheritedVariables
        )
      )
      .join('')
  }
  if (typeof node !== 'object') return escapeXMLText(node)

  const type = node.type
  if (type === 'text') {
    throw new Error(
      '<text> nodes are not currently supported, please convert them to <path>'
    )
  }

  const { children, style, ...restProps } = node.props || {}
  const variables = getSVGVariables(style, inheritedVariables)
  const color = resolveSVGVariables(style?.color, variables)
  const currentColor = color
    ? String(resolveSVGColors(color, inheritedColor, convertColors))
    : inheritedColor

  if ((type as typeof node.type | typeof FragmentSymbol) === FragmentSymbol) {
    return translateSVGNodeToSVGString(
      children,
      currentColor,
      convertColors,
      variables
    )
  }

  if (typeof type !== 'string') {
    throw new Error('Only intrinsic elements are supported inside <svg>')
  }

  const attrs: Record<string, unknown> = {}
  for (const [k, value] of Object.entries(restProps)) {
    const withVariables = resolveSVGVariables(value, variables)
    if (withVariables === undefined) continue
    let resolvedValue = resolveSVGColors(
      withVariables,
      currentColor,
      convertColors
    )

    if ((k === 'href' || k === 'xlinkHref') && type === 'image') {
      resolvedValue = cache.get(resolvedValue as string)[0]
    }
    if (k === 'd' && typeof resolvedValue === 'string') {
      resolvedValue = normalizePathData(resolvedValue)
    }

    const name = ATTRIBUTE_MAPPING[k] || k
    attrs[name] = resolvedValue
  }

  if (style) {
    const declarations: string[] = []
    for (const [k, value] of Object.entries(style)) {
      // Custom properties are resolved above.
      if (k.startsWith('--')) continue
      const resolved =
        k === 'color' ? currentColor : resolveSVGVariables(value, variables)
      if (resolved === undefined) continue
      declarations.push(
        `${midline(k)}:${
          k === 'color'
            ? currentColor
            : resolveSVGColors(resolved, currentColor, convertColors)
        }`
      )
    }
    if (declarations.length) attrs.style = declarations.join(';')
  }

  return buildXMLString(
    type,
    attrs,
    translateSVGNodeToSVGString(
      children,
      currentColor,
      convertColors,
      variables
    )
  )
}
/**
 * Serializes an SVG `<filter>` of the document with an `id`, for the
 * elements that reference it with `filter: url(#id)`.
 */
export function serializeSVGFilter(
  node: ReactElement,
  id: string,
  inheritedColor: string,
  convertColors: boolean
) {
  return translateSVGNodeToSVGString(
    { ...node, props: { ...node.props, id } } as ReactElement,
    inheritedColor,
    convertColors
  )
}

/**
 * pre process node and resolve absolute link to img data for image element.
 * The SVG `<filter>` elements with an `id` are added to `filters`, the first
 * one for each `id`, like `getElementById()`.
 * @param node ReactNode
 * @returns
 */
export async function preProcessNode(
  node: ReactNode,
  filters?: Map<string, ReactElement>
) {
  const set = new Set<string | Buffer | ArrayBuffer>()
  const walk = (_node: ReactNode) => {
    if (!_node) return
    if (!isReactElement(_node)) return

    if (Array.isArray(_node)) {
      _node.forEach((v) => walk(v))
      return
    } else if (typeof _node === 'object') {
      if (_node.type === 'image') {
        const imageSrc = _node.props.href || _node.props.xlinkHref
        if (imageSrc) {
          if (set.has(imageSrc)) {
            // do nothing
          } else {
            set.add(imageSrc)
          }
        }
      } else if (_node.type === 'img') {
        if (set.has(_node.props.src)) {
          // do nothing
        } else {
          set.add(_node.props.src)
        }
      } else if (
        _node.type === 'filter' &&
        filters &&
        typeof _node.props?.id === 'string' &&
        !filters.has(_node.props.id)
      ) {
        filters.set(_node.props.id, _node as ReactElement)
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
  inheritedColor: string,
  convertColors = true,
  inheritedVariables: CSSVariables = {}
): Promise<string> {
  let {
    viewBox,
    viewbox,
    width,
    height,
    className,
    style,
    children,
    // It transforms the element's box instead, see `layout()`.
    transform: _transform,
    ...restProps
  } = node.props || {}

  viewBox ||= viewbox

  // We directly assign the xmlns attribute here to deduplicate.
  restProps.xmlns = 'http://www.w3.org/2000/svg'

  const variables = getSVGVariables(style, inheritedVariables)
  const color = resolveSVGVariables(style?.color, variables)
  const currentColor = color
    ? String(resolveSVGColors(color, inheritedColor, convertColors))
    : inheritedColor
  const viewBoxSize = parseViewBox(viewBox)

  // ratio = height / width
  const ratio = viewBoxSize ? viewBoxSize[3] / viewBoxSize[2] : null
  // A missing size follows from the other one and the ratio of the viewBox.
  width = width || (ratio && height ? height / ratio : null)
  height = height || (ratio && width ? width * ratio : null)

  // Sizes that are still missing are left out.
  restProps.width = width ?? undefined
  restProps.height = height ?? undefined
  if (viewBox) restProps.viewBox = viewBox

  const attrs: Record<string, unknown> = {}
  for (const [k, value] of Object.entries(restProps)) {
    const resolved = resolveSVGVariables(value, variables)
    if (resolved === undefined) continue
    const name = ATTRIBUTE_MAPPING[k] || k
    attrs[name] = resolveSVGColors(resolved, currentColor, convertColors)
  }

  const serializedSVG = buildXMLString(
    'svg',
    attrs,
    translateSVGNodeToSVGString(
      children,
      currentColor,
      convertColors,
      variables
    )
  )

  return `data:image/svg+xml;utf8,${serializedSVG.replace(
    EMBEDDED_SVG_DATA_URL_SYMBOLS,
    encodeURIComponent
  )}`
}
