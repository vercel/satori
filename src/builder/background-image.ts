import CssDimension from '../vendor/parse-css-dimension/index.js'
import { buildXMLString } from '../utils.js'

import { resolveImageData } from '../handler/image.js'
import { buildLinearGradient } from './gradient/linear.js'
import { buildRadialGradient } from './gradient/radial.js'
import cssColorParse from 'parse-css-color'

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

function calculateKeywordSize(
  keyword: string,
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number
): [number, number] {
  if (!imageWidth || !imageHeight) {
    return [containerWidth, containerHeight]
  }

  if (keyword === 'cover') {
    // Scale to cover the container (use max scale to ensure it covers)
    const scaleX = containerWidth / imageWidth
    const scaleY = containerHeight / imageHeight
    const scale = Math.max(scaleX, scaleY)
    return [imageWidth * scale, imageHeight * scale]
  }

  if (keyword === 'contain') {
    // Scale to fit within the container (use min scale to ensure it fits)
    const scaleX = containerWidth / imageWidth
    const scaleY = containerHeight / imageHeight
    const scale = Math.min(scaleX, scaleY)
    return [imageWidth * scale, imageHeight * scale]
  }

  // For 'auto' or other values, handle auto
  if (keyword === 'auto' || keyword.includes('auto')) {
    const parts = keyword.split(' ')
    const widthPart = parts[0] || 'auto'
    const heightPart = parts[1] || parts[0] || 'auto'

    let finalWidth = imageWidth
    let finalHeight = imageHeight

    if (widthPart === 'auto' && heightPart !== 'auto') {
      // Width is auto, height is specified
      const parsedHeight = toAbsoluteValue(heightPart, containerHeight)
      finalHeight = parsedHeight
      finalWidth = (imageWidth / imageHeight) * parsedHeight
    } else if (heightPart === 'auto' && widthPart !== 'auto') {
      // Height is auto, width is specified
      const parsedWidth = toAbsoluteValue(widthPart, containerWidth)
      finalWidth = parsedWidth
      finalHeight = (imageHeight / imageWidth) * parsedWidth
    }
    // If both are auto, use intrinsic dimensions

    return [finalWidth, finalHeight]
  }

  return [containerWidth, containerHeight]
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

  // Check if size is a keyword (cover, contain, auto) that needs to be calculated later
  const isKeywordSize =
    size &&
    (size === 'cover' ||
      size === 'contain' ||
      size === 'auto' ||
      size.includes('auto'))

  // For gradients, keyword sizes (cover, contain, auto) resolve to the
  // container dimensions since gradients have no intrinsic size.
  // For url() images, keyword sizes are calculated later using the image's
  // intrinsic dimensions.
  const isGradient =
    image.startsWith('linear-gradient(') ||
    image.startsWith('repeating-linear-gradient(') ||
    image.startsWith('radial-gradient(') ||
    image.startsWith('repeating-radial-gradient(')

  const dimensions =
    isKeywordSize && isGradient
      ? [width, height] // Gradients have no intrinsic size; keyword sizes resolve to container
      : isKeywordSize
      ? [0, 0] // Will be calculated later when we have image dimensions
      : parseLengthPairs(size, {
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

  if (
    image.startsWith('radial-gradient(') ||
    image.startsWith('repeating-radial-gradient(')
  ) {
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
    const [src, imageWidth, imageHeight] = await resolveImageData(
      image.slice(4, -1)
    )

    let resolvedWidth: number
    let resolvedHeight: number

    if (isKeywordSize) {
      // Calculate dimensions based on keyword (cover, contain, auto)
      const [calcWidth, calcHeight] = calculateKeywordSize(
        size,
        width,
        height,
        imageWidth,
        imageHeight
      )
      resolvedWidth = calcWidth
      resolvedHeight = calcHeight
    } else {
      // Use the previously parsed dimensions
      const dimensionsWithoutFallback = parseLengthPairs(size, {
        x: width,
        y: height,
        defaultX: 0,
        defaultY: 0,
      })
      resolvedWidth =
        from === 'mask'
          ? imageWidth || dimensionsWithoutFallback[0]
          : dimensionsWithoutFallback[0] || imageWidth
      resolvedHeight =
        from === 'mask'
          ? imageHeight || dimensionsWithoutFallback[1]
          : dimensionsWithoutFallback[1] || imageHeight
    }

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

  if (cssColorParse(image)) {
    const colorObj = cssColorParse(image)
    const [r, g, b, a] = colorObj.values
    const alpha = a !== undefined ? a : 1
    const color = `rgba(${r},${g},${b},${alpha})`

    return [
      `satori_bi${id}`,
      buildXMLString(
        'pattern',
        {
          id: `satori_bi${id}`,
          patternContentUnits: 'userSpaceOnUse',
          patternUnits: 'userSpaceOnUse',
          x: left,
          y: top,
          width: width,
          height: height,
        },
        buildXMLString('rect', {
          x: 0,
          y: 0,
          width: width,
          height: height,
          fill: color,
        })
      ),
    ]
  }

  throw new Error(`Invalid background image: "${image}"`)
}
