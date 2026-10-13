import { buildXMLString } from '../utils.js'
import buildBackgroundImage, { getBoxArea } from './background-image.js'
import type { MaskProperty } from '../parser/mask.js'

const genMaskImageId = (id: string) => `satori_mi-${id}`

/** Boxes that SVG and HTML elements share, others are the border box. */
const toBox = (box: string) =>
  box === 'padding-box' || box === 'content-box' ? box : 'border-box'

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
  const maskImage = style.maskImage as unknown as MaskProperty[]
  const length = maskImage.length
  if (!length) return ['', '']
  const miId = genMaskImageId(id)
  const box = { left, top, width, height }

  // Layers with their boxes, from the bottom one.
  const layers: { def: string; shape: string; composite: string }[] = []
  for (let i = 0; i < length; i++) {
    const m = maskImage[i]
    const origin = toBox(m.origin)
    const clip = toBox(m.clip)

    const layer = await buildBackgroundImage(
      {
        id: `${miId}-${i}`,
        ...box,
        origin:
          origin === 'border-box' ? undefined : getBoxArea(box, style, origin),
      },
      m,
      inheritedStyle,
      'mask'
    )
    // A `none` layer doesn't mask the element.
    if (!layer) continue
    const [_id, def] = layer
    const area = clip === 'border-box' ? box : getBoxArea(box, style, clip)

    layers.push({
      def,
      shape: buildXMLString('rect', {
        x: area.left,
        y: area.top,
        width: area.width,
        height: area.height,
        fill: `url(#${_id})`,
      }),
      composite: m.composite,
    })
  }

  if (!layers.length) return ['', '']
  if (layers.length === 1) {
    const [{ def, shape }] = layers
    return [miId, buildXMLString('mask', { id: miId }, def + shape)]
  }

  // Layers are composited with masks, which renderers support better than
  // blending in masks. Each layer is a mask, and so is each result of
  // compositing it with the layers below. Inside them, white masked by
  // another mask paints that mask.
  const rectOf = (attrs: Record<string, string>) =>
    buildXMLString('rect', { x: left, y: top, width, height, ...attrs })
  const paint = (maskId: string) =>
    rectOf({ fill: '#fff', mask: `url(#${maskId})` })
  const masked = (maskId: string, content: string) =>
    buildXMLString('g', { mask: `url(#${maskId})` }, content)

  let masks = ''
  const inverses = new Set<string>()
  const inverse = (maskId: string) => {
    const inverseId = `${maskId}-inverse`
    if (!inverses.has(maskId)) {
      inverses.add(maskId)
      masks += buildXMLString(
        'mask',
        { id: inverseId },
        rectOf({ fill: '#fff' }) +
          rectOf({ fill: '#000', mask: `url(#${maskId})` })
      )
    }
    return inverseId
  }

  let below = ''
  layers.forEach(({ def, shape, composite }, i) => {
    const layerId = `${miId}-layer-${i}`
    masks += buildXMLString('mask', { id: layerId }, def + shape)
    if (!i) {
      below = layerId
      return
    }

    let content: string
    if (composite === 'intersect') {
      content = masked(layerId, paint(below))
    } else if (composite === 'subtract') {
      content = masked(inverse(below), paint(layerId))
    } else if (composite === 'exclude') {
      // The two parts only overlap where layers are partly transparent, so
      // this is exact for opaque layers.
      content =
        masked(inverse(below), paint(layerId)) +
        masked(inverse(layerId), paint(below))
    } else {
      content = paint(below) + paint(layerId)
    }
    const resultId = i === layers.length - 1 ? miId : `${miId}-${i}`
    masks += buildXMLString('mask', { id: resultId }, content)
    below = resultId
  })

  return [miId, masks]
}
