import { buildXMLString } from '../utils.js'
import buildBackgroundImage from './background-image.js'
import type { MaskProperty } from '../parser/mask.js'

const genMaskImageId = (id: string) => `satori_mi-${id}`

export default async function buildMaskImage(
  v: {
    id: string
    left: number
    top: number
    width: number
    height: number
  },
  style: Record<string, string | number>,
  inheritedStyle: Record<string, string | number>
) {
  if (!style.maskImage) return []
  const { left, top, width, height, id } = v
  const maskImage = style.maskImage as unknown as MaskProperty[]
  if (maskImage.every((m) => m.image === 'none')) return []
  const length = maskImage.length
  const miId = genMaskImageId(id)

  let mask = ''

  for (let i = 0; i < length; i++) {
    const m = maskImage[i]
    if (!m.image || m.image === 'none') continue

    const [_id, def] = await buildBackgroundImage(
      { id: `${miId}-${i}`, left, top, width, height },
      m,
      inheritedStyle,
      'mask'
    )

    mask +=
      def +
      buildXMLString('rect', {
        x: 0,
        y: 0,
        width,
        height,
        fill: `url(#${_id})`,
      })
  }

  mask = buildXMLString('mask', { id: miId }, mask)

  return [miId, mask]
}
