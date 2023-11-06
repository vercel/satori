import { buildXMLString } from '../utils.js'
import buildBackgroundImage from './background-image.js'
import type { MaskParsedRes } from '../parser/mask.js'

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
): Promise<[string, string]> {
  if (!style.maskImage) return ['', '']

  const { left, top, width, height, id } = v
  const maskImage = style.maskImage as unknown as MaskParsedRes
  const images = maskImage.detail
  const length = images.length

  if (!length) return ['', '']

  const miId = genMaskImageId(id)
  let mask = ''

  for (let i = 0; i < length; i++) {
    const m = images[i]

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

  mask = buildXMLString(
    'mask',
    {
      id: miId,
      // FIXME: although mask-type's default value is luminance, but we can get the same result with what browser renders unless
      // i set mask-type with alpha
      'mask-type': maskImage.type,
    },
    mask
  )

  return [miId, mask]
}
