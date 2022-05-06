import type { ParsedTransformOrigin } from '../transform-origin'

import { buildXMLString } from '../utils'
import radius from './border-radius'
import shadow from './shadow'
import transform from './transform'

export default function image(
  {
    id,
    left,
    top,
    width,
    height,
    src,
    debug,
    isInheritingTransform,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    src: string
    isInheritingTransform: boolean
    debug?: boolean
  },
  style: Record<string, number | string>
) {
  if (style.display === 'none') return ''

  let clip = ''
  let opacity = 1
  let matrix = ''

  const preserveAspectRatio =
    style.objectFit === 'contain'
      ? 'xMidYMid'
      : style.objectFit === 'cover'
      ? 'xMidYMid slice'
      : 'none'

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )

  const clipPathId = style._inheritedClipPathId as number | undefined
  if (path) {
    clip = buildXMLString(
      'clipPath',
      {
        id: `satori_c-${id}`,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
      },
      buildXMLString('path', {
        x: left,
        y: top,
        width,
        height,
        d: path,
      })
    )
  }

  if (style.opacity) {
    opacity = +style.opacity
  }

  const filter = shadow({ width, height, id }, style)

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

  return (
    filter +
    (filter ? `<g filter="url(#satori_s-${id})">` : '') +
    clip +
    buildXMLString('image', {
      x: left,
      y: top,
      width,
      height,
      href: src,
      preserveAspectRatio,
      transform: matrix ? matrix : undefined,
      'clip-path': clip
        ? `url(#satori_c-${id})`
        : clipPathId
        ? `url(#${clipPathId})`
        : undefined,
    }) +
    (filter ? `</g>` : '')
  )
}
