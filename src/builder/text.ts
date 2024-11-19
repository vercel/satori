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
  let opacity = 1

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

  if (style.opacity !== undefined) {
    opacity = +style.opacity
  }

  return { matrix, opacity }
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
    opacity,
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
    opacity: number
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
      style: style.filter ? `filter:${style.filter}` : undefined,
    }
    return [
      (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
        buildXMLString('image', {
          ...shapeProps,
          opacity: opacity !== 1 ? opacity : undefined,
        }) +
        (decorationShape || '') +
        (filter ? '</g>' : '') +
        extra,
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
    style: style.filter ? `filter:${style.filter}` : undefined,
    'stroke-width': style.WebkitTextStrokeWidth
      ? `${style.WebkitTextStrokeWidth}px`
      : undefined,
    stroke: style.WebkitTextStrokeWidth
      ? style.WebkitTextStrokeColor
      : undefined,
    'stroke-linejoin': style.WebkitTextStrokeWidth ? 'round' : undefined,
    'paint-order': style.WebkitTextStrokeWidth ? 'stroke' : undefined,
  }
  return [
    (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
      buildXMLString(
        'text',
        {
          ...shapeProps,
          fill: style.color,
          opacity: opacity !== 1 ? opacity : undefined,
        },
        escapeHTML(content)
      ) +
      (decorationShape || '') +
      (filter ? '</g>' : '') +
      extra,
    shape ? buildXMLString('text', shapeProps, escapeHTML(content)) : '',
  ]
}
