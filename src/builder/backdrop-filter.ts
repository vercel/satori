import { buildXMLString } from '../utils.js'

export function backdropBlur({
  id,
  left,
  top,
  width,
  height,
  path,
  type,
  matrix,
  currentClipPath,
  mask,
  radius,
}: {
  id: string
  left: number
  top: number
  width: number
  height: number
  path: string
  type: 'rect' | 'path'
  matrix: string | undefined
  currentClipPath: string | undefined
  mask: string | undefined
  radius: number
}) {
  if (!radius) return ['', ''] as const

  const filterId = `satori_bf-${id}`
  const clipId = `satori_bfc-${id}`
  const expansion = radius * 3

  const definitions =
    buildXMLString(
      'filter',
      {
        id: filterId,
        x: left - expansion,
        y: top - expansion,
        width: width + expansion * 2,
        height: height + expansion * 2,
        filterUnits: 'userSpaceOnUse',
        'color-interpolation-filters': 'sRGB',
      },
      buildXMLString('feGaussianBlur', {
        in: 'BackgroundImage',
        stdDeviation: radius,
      })
    ) +
    buildXMLString(
      'clipPath',
      {
        id: clipId,
        'clip-path': currentClipPath,
      },
      buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        d: path || undefined,
        transform: matrix || undefined,
      })
    )

  const shape = buildXMLString('rect', {
    x: left - expansion,
    y: top - expansion,
    width: width + expansion * 2,
    height: height + expansion * 2,
    fill: 'transparent',
    transform: matrix || undefined,
    filter: `url(#${filterId})`,
    'clip-path': `url(#${clipId})`,
    mask,
  })

  return [definitions, shape] as const
}
