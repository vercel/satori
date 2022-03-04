import type { ParsedTransformOrigin } from '../transform-origin'
import transform from './transform'
import { buildXMLString } from '../utils'

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

  if (style.opacity) {
    opacity = +style.opacity
  }

  return { matrix, opacity }
}

export default function text(
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
    debug,
  }: {
    content: string
    filter: string
    id: number
    left: number
    top: number
    width: number
    height: number
    matrix: string
    opacity: number
    image: string | null
    debug?: boolean
  },
  style: Record<string, number | string>
) {
  let extra = ''
  if (debug) {
    extra = buildXMLString('rect', {
      x: left,
      y: top,
      width,
      height: 0.5,
      fill: 'transparent',
      stroke: '#575eff',
      'stroke-width': 1,
      transform: matrix || undefined,
    })
  }

  // This grapheme should be rendered as an image.
  if (image) {
    return (
      (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
      buildXMLString('image', {
        href: image,
        x: left,
        y: top,
        width,
        height,
        transform: matrix || undefined,
        opacity: opacity !== 1 ? opacity : undefined,
      }) +
      (filter ? '</g>' : '') +
      extra
    )
  }

  // Do not embed the font, use <text> with the raw content instead.
  return (
    (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
    buildXMLString(
      'text',
      {
        x: left,
        y: top,
        width,
        height,
        fill: style.color,
        'font-weight': style.fontWeight,
        'font-style': style.fontStyle,
        'font-size': style.fontSize,
        'font-family': style.fontFamily,
        'letter-spacing': style.letterSpacing || undefined,
        transform: matrix || undefined,
        opacity: opacity !== 1 ? opacity : undefined,
      },
      content
    ) +
    (filter ? '</g>' : '') +
    extra
  )
}
