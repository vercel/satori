import CssDimension from '../vendor/parse-css-dimension/index.js'
import { buildXMLString } from '../utils.js'

import { resolveImageData } from '../handler/image.js'
import { buildLinearGradient } from './gradient/linear.js'
import { buildRadialGradient } from './gradient/radial.js'

interface Background {
  attachment?: string
  color?: string
  clip: string
  image: string
  origin?: string
  position: string
  size: string
  repeat: string
}

function toAbsoluteValue(v: string | number, base: number) {
  if (typeof v === 'string' && v.endsWith('%')) {
    return (base * parseFloat(v)) / 100
  }
  return +v
}

function parseLengthPairs(
  str: string,
  {
    x,
    y,
    defaultX,
    defaultY,
  }: {
    x: number
    y: number
    defaultX: number | string
    defaultY: number | string
  }
) {
  return (
    str
      ? str
          .split(' ')
          .map((value) => {
            try {
              const parsed = new CssDimension(value)
              return parsed.type === 'length' || parsed.type === 'number'
                ? parsed.value
                : parsed.value + parsed.unit
            } catch (e) {
              return null
            }
          })
          .filter((v) => v !== null)
      : [defaultX, defaultY]
  ).map((v, index) => toAbsoluteValue(v, [x, y][index]))
}

export default async function backgroundImage(
  {
    id,
    width,
    height,
    left,
    top,
  }: { id: string; width: number; height: number; left: number; top: number },
  { image, size, position, repeat }: Background,
  inheritableStyle: Record<string, number | string>,
  from?: 'background' | 'mask'
): Promise<string[]> {
  // Default to `repeat`.
  repeat = repeat || 'repeat'
  from = from || 'background'

  const repeatX = repeat === 'repeat-x' || repeat === 'repeat'
  const repeatY = repeat === 'repeat-y' || repeat === 'repeat'

  const dimensions = parseLengthPairs(size, {
    x: width,
    y: height,
    defaultX: width,
    defaultY: height,
  })
  const offsets = parseLengthPairs(position, {
    x: width,
    y: height,
    defaultX: 0,
    defaultY: 0,
  })

  if (
    image.startsWith('linear-gradient(') ||
    image.startsWith('repeating-linear-gradient(')
  ) {
    return buildLinearGradient(
      { id, width, height, repeatX, repeatY },
      image,
      dimensions,
      offsets,
      inheritableStyle,
      from
    )
  }

  if (image.startsWith('radial-gradient(')) {
    return buildRadialGradient(
      { id, width, height, repeatX, repeatY },
      image,
      dimensions,
      offsets,
      inheritableStyle,
      from
    )
  }

  if (image.startsWith('url(')) {
    const dimensionsWithoutFallback = parseLengthPairs(size, {
      x: width,
      y: height,
      defaultX: 0,
      defaultY: 0,
    })
    const [src, imageWidth, imageHeight] = await resolveImageData(
      image.slice(4, -1)
    )
    const resolvedWidth =
      from === 'mask'
        ? imageWidth || dimensionsWithoutFallback[0]
        : dimensionsWithoutFallback[0] || imageWidth
    const resolvedHeight =
      from === 'mask'
        ? imageHeight || dimensionsWithoutFallback[1]
        : dimensionsWithoutFallback[1] || imageHeight

    return [
      `satori_bi${id}`,
      buildXMLString(
        'pattern',
        {
          id: `satori_bi${id}`,
          patternContentUnits: 'userSpaceOnUse',
          patternUnits: 'userSpaceOnUse',
          x: offsets[0] + left,
          y: offsets[1] + top,
          width: repeatX ? resolvedWidth : '100%',
          height: repeatY ? resolvedHeight : '100%',
        },
        buildXMLString('image', {
          x: 0,
          y: 0,
          width: resolvedWidth,
          height: resolvedHeight,
          preserveAspectRatio: 'none',
          href: src,
        })
      ),
    ]
  }

  throw new Error(`Invalid background image: "${image}"`)
}
