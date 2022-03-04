import type { ParsedTransformOrigin } from '../transform-origin'

import backgroundImage from './background-image'
import radius from './border-radius'
import shadow from './shadow'
import transform from './transform'
import overflow from './overflow'
import { buildXMLString } from '../utils'

export default function rect(
  {
    id,
    left,
    top,
    width,
    height,
    isInheritingTransform,
    debug,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    debug?: boolean
  },
  style: Record<string, number | string>
) {
  if (style.display === 'none') return ''

  let type = 'rect'
  let stroke = 'transparent'
  let strokeWidth = 0
  let matrix = ''
  let defs = ''
  let fills: string[] = []
  let opacity = 1
  let extra = ''

  if (style.backgroundColor) {
    fills.push(style.backgroundColor as string)
  }

  if (style.borderWidth) {
    strokeWidth = style.borderWidth as number
    stroke = style.borderColor as string
  }

  if (style.opacity) {
    opacity = +style.opacity
  }

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

  if (style.backgroundImage) {
    const backgrounds = (style.backgroundImage as any)
      .map((background, index) =>
        backgroundImage({ id: id + '_' + index, width, height }, background)
      )
      .filter(Boolean)
    for (const background of backgrounds) {
      defs += background[1]
      fills.push(`url(#${background[0]})`)
    }
  }

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )
  if (path) {
    type = 'path'
  }

  const clip = overflow(
    { left, top, width, height, path, id },
    style as Record<string, number>
  )
  const clipPathId = style._inheritedClipPathId as number | undefined

  const filter = shadow({ width, height, id }, style)

  if (debug) {
    extra = buildXMLString('rect', {
      x: left,
      y: top,
      width,
      height,
      fill: 'transparent',
      stroke: '#ff5757',
      'stroke-width': 1,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  if (!fills.length) fills.push('transparent')

  // Each background generates a new rectangle.
  // @TODO: Not sure if this is the best way to do it, maybe <pattern> with
  // multiple <image>s is better.
  const shape = fills
    .map((fill, i) => {
      if (fill === 'transparent' && !(i === fills.length - 1 && strokeWidth)) {
        return ''
      }

      const hasStroke = i === fills.length - 1 && strokeWidth
      return buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        fill,
        stroke: hasStroke ? stroke : undefined,
        'stroke-width': hasStroke ? strokeWidth : undefined,
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
      })
    })
    .join('')

  return (
    (defs ? `<defs>${defs}</defs>` : '') +
    clip +
    (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
    (opacity !== 1 ? `<g opacity="${opacity}">` : '') +
    shape +
    (opacity !== 1 ? `</g>` : '') +
    (filter ? '</g>' : '') +
    extra
  )
}
