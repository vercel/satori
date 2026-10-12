import escapeHTML from 'escape-html'
import type { ParsedTransformOrigin } from '../transform-origin.js'
import transform from './transform.js'
import { buildXMLString } from '../utils.js'

export function container(
  {
    left,
    top,
    width,
    height,
    isInheritingTransform,
  }: {
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
  },
  style: Record<string, number | string>
) {
  let matrix = ''

  if (style.transform) {
    matrix = transform(
      {
        left,
        top,
        width,
        height,
      },
      style.transform as unknown as number[],
      isInheritingTransform,
      style.transformOrigin as ParsedTransformOrigin | undefined
    )
  }

  return { matrix }
}

/** The color glyphs are filled with. */
export function getTextFillColor(style: Record<string, number | string>) {
  return (style.WebkitTextFillColor ?? style.color) as string
}

/**
 * The path elements of glyphs, with `attributes` such as the fill and the
 * text stroke. Synthetic bold glyphs are emboldened by a stroke of
 * `boldWidth` with the fill color, like the fake bold of browsers, and their
 * text stroke is around the emboldened glyphs. `id` makes the ids of masks
 * unique.
 */
export function buildGlyphPaths(
  { path, boldPath }: { path: string; boldPath: string },
  attributes: Record<string, string | number | undefined>,
  boldWidth: number,
  id: string
) {
  const result = path.trim()
    ? buildXMLString('path', { ...attributes, d: path })
    : ''
  if (!boldPath.trim()) return result

  const {
    stroke,
    'stroke-width': strokeWidth,
    'stroke-linejoin': strokeLinejoin,
    'paint-order': paintOrder,
    ...fillAttributes
  } = attributes
  const fill = buildXMLString('path', {
    ...fillAttributes,
    d: boldPath,
    stroke: fillAttributes.fill,
    'stroke-width': boldWidth,
  })
  if (!stroke) return result + fill

  // The text stroke is centered on the edge of the emboldened glyphs, which
  // is half of `boldWidth` outside the glyphs. It's drawn as wide as both,
  // and masked to outside the glyphs moved out by half of their difference.
  const width = parseFloat(String(strokeWidth)) || 0
  const maskId = `satori_sb-${id}`
  const region = { x: -1e5, y: -1e5, width: 2e5, height: 2e5 }
  const mask = buildXMLString(
    'mask',
    { id: maskId, maskUnits: 'userSpaceOnUse', ...region },
    buildXMLString('rect', { ...region, fill: '#fff' }) +
      buildXMLString('path', {
        d: boldPath,
        fill: '#000',
        stroke: width > boldWidth ? '#fff' : '#000',
        'stroke-width': Math.abs(width - boldWidth),
        'stroke-linejoin': strokeLinejoin,
      })
  )
  const ring = buildXMLString('path', {
    d: boldPath,
    fill: 'none',
    stroke,
    'stroke-width': width + boldWidth,
    'stroke-linejoin': strokeLinejoin,
    transform: fillAttributes.transform,
    mask: `url(#${maskId})`,
  })
  // Parts that aren't listed in `paint-order` are painted after the listed
  // ones, in the default order.
  const order = String(paintOrder ?? '').split(/\s+/)
  for (const part of ['fill', 'stroke']) {
    if (!order.includes(part)) order.push(part)
  }
  const strokeFirst = order.indexOf('stroke') < order.indexOf('fill')
  return result + mask + (strokeFirst ? ring + fill : fill + ring)
}

/** Attributes for `-webkit-text-stroke` and `paint-order`. */
export function getTextStrokeAttributes(
  style: Record<string, number | string>
) {
  const width = style.WebkitTextStrokeWidth
  if (!width) return {}
  return {
    'stroke-width': `${width}px`,
    stroke: style.WebkitTextStrokeColor ?? style.color,
    'stroke-linejoin': 'round',
    // The stroke is painted above the fill by default.
    'paint-order':
      style.paintOrder && style.paintOrder !== 'normal'
        ? style.paintOrder
        : undefined,
  }
}

export default function buildText(
  {
    id,
    content,
    filter,
    left,
    top,
    width,
    height,
    matrix,
    image,
    clipPathId,
    debug,
    shape,
    decorationShape,
  }: {
    content: string
    filter: string
    id: string
    left: number
    top: number
    width: number
    height: number
    matrix: string
    image: string | null
    clipPathId?: string
    debug?: boolean
    shape?: boolean
    decorationShape?: string
  },
  style: Record<string, number | string>
) {
  let extra = ''
  if (debug) {
    extra = buildXMLString('rect', {
      x: left,
      y: top - height,
      width,
      height,
      fill: 'transparent',
      stroke: '#575eff',
      'stroke-width': 1,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  // This grapheme should be rendered as an image.
  if (image) {
    const shapeProps = {
      href: image,
      x: left,
      y: top,
      width,
      height,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    }
    const imageMarkup =
      buildXMLString('image', shapeProps) + (decorationShape || '')
    return [
      (filter
        ? filter +
          buildXMLString('g', { filter: `url(#satori_s-${id})` }, imageMarkup)
        : imageMarkup) + extra,
      // SVG doesn't support `<image>` as the shape.
      '',
    ]
  }

  // Do not embed the font, use <text> with the raw content instead.
  const shapeProps = {
    x: left,
    y: top,
    width,
    height,
    'font-weight': style.fontWeight,
    'font-style': style.fontStyle,
    'font-size': style.fontSize,
    'font-family': style.fontFamily,
    'letter-spacing': style.letterSpacing || undefined,
    transform: matrix || undefined,
    'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    ...getTextStrokeAttributes(style),
  }
  const textMarkup =
    buildXMLString(
      'text',
      {
        ...shapeProps,
        fill: getTextFillColor(style),
      },
      escapeHTML(content)
    ) + (decorationShape || '')
  return [
    (filter
      ? filter +
        buildXMLString('g', { filter: `url(#satori_s-${id})` }, textMarkup)
      : textMarkup) + extra,
    shape ? buildXMLString('text', shapeProps, escapeHTML(content)) : '',
  ]
}
