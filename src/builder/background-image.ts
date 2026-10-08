import { buildXMLString, lengthToNumber } from '../utils.js'

import { hasIntrinsicSize, resolveImageData } from '../handler/image.js'
import { buildLinearGradient } from './gradient/linear.js'
import { buildRadialGradient } from './gradient/radial.js'
import { buildConicGradient } from './gradient/conic.js'
import { isColor } from '../parser/color.js'

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

type Style = Record<string, number | string>

const resolveLength = (value: string, base: number, style: Style) =>
  lengthToNumber(value, style.fontSize as number, base, style, true) ?? 0

/**
 * Resolves `background-size` in a positioning area, with the intrinsic size
 * of the image if it has one. Gradients don't, so they fill the area.
 * https://www.w3.org/TR/css-backgrounds-3/#the-background-size
 */
function resolveSize(
  size: string | undefined,
  areaWidth: number,
  areaHeight: number,
  imageWidth: number,
  imageHeight: number,
  style: Style,
  /** Without a size, an image with a ratio is sized like `contain`. */
  hasSize = true
): [number, number] {
  let value = (size || 'auto').trim().toLowerCase()
  const hasRatio = imageWidth > 0 && imageHeight > 0
  if (!hasSize && hasRatio && /^auto(\s+auto)?$/.test(value)) value = 'contain'
  if (value === 'cover' || value === 'contain') {
    if (!hasRatio) return [areaWidth, areaHeight]
    const scale = (value === 'cover' ? Math.max : Math.min)(
      areaWidth / imageWidth,
      areaHeight / imageHeight
    )
    return [imageWidth * scale, imageHeight * scale]
  }

  const [widthValue, heightValue = 'auto'] = value.split(/\s+/)
  let width =
    widthValue === 'auto'
      ? undefined
      : resolveLength(widthValue, areaWidth, style)
  let height =
    heightValue === 'auto'
      ? undefined
      : resolveLength(heightValue, areaHeight, style)
  if (width === undefined && height === undefined) {
    return hasRatio ? [imageWidth, imageHeight] : [areaWidth, areaHeight]
  }
  width ??= hasRatio ? (imageWidth / imageHeight) * height : areaWidth
  height ??= hasRatio ? (imageHeight / imageWidth) * width : areaHeight
  return [width, height]
}

/**
 * Resolves `background-position` with 1 to 4 values. Percentages are of the
 * space left by the image, so `100%` aligns the edges of the image and area.
 * https://www.w3.org/TR/css-backgrounds-3/#the-background-position
 */
function resolvePosition(
  position: string | undefined,
  freeWidth: number,
  freeHeight: number,
  style: Style
): [number, number] {
  const tokens = (position || '0% 0%').trim().toLowerCase().split(/\s+/)
  const isX = (token: string) => token === 'left' || token === 'right'
  const isY = (token: string) => token === 'top' || token === 'bottom'
  const isKeyword = (token: string) =>
    isX(token) || isY(token) || token === 'center'

  // The edge each offset is from, and the offset.
  let x: [string, string] = ['left', '50%']
  let y: [string, string] = ['top', '50%']
  const keywordOffset = (token: string, start: string): [string, string] =>
    token === 'center' ? [start, '50%'] : [token, '0%']

  if (tokens.length <= 2) {
    let [first, second = 'center'] = tokens
    if (isY(first) || isX(second)) [first, second] = [second, first]
    x = isKeyword(first) ? keywordOffset(first, 'left') : ['left', first]
    y = isKeyword(second) ? keywordOffset(second, 'top') : ['top', second]
  } else {
    // Keywords, each followed by an optional offset.
    let assignedX = false
    let assignedY = false
    for (let i = 0; i < tokens.length; i++) {
      const keyword = tokens[i]
      const offset = !isKeyword(tokens[i + 1] ?? 'center') ? tokens[++i] : '0%'
      if (isX(keyword) || (keyword === 'center' && !assignedX)) {
        x = keyword === 'center' ? ['left', '50%'] : [keyword, offset]
        assignedX = true
      } else {
        y = keyword === 'center' ? ['top', '50%'] : [keyword, offset]
        assignedY = true
      }
    }
    if (!assignedY) y = ['top', '50%']
  }

  const resolve = ([edge, offset]: [string, string], free: number) => {
    const value = resolveLength(offset, free, style)
    return edge === 'right' || edge === 'bottom' ? free - value : value
  }
  return [resolve(x, freeWidth), resolve(y, freeHeight)]
}

export default async function backgroundImage(
  {
    id,
    width,
    height,
    left,
    top,
    origin,
  }: {
    id: string
    width: number
    height: number
    left: number
    top: number
    /** The positioning area, the box by default. */
    origin?: { left: number; top: number; width: number; height: number }
  },
  { image, size, position, repeat }: Background,
  inheritableStyle: Record<string, number | string>,
  from?: 'background' | 'mask'
): Promise<string[] | undefined> {
  // A layer without an image.
  if (image.trim() === 'none') return

  from = from || 'background'

  // One keyword for both axes, or one for each.
  const [repeatX, repeatY] = (() => {
    const keywords = (repeat || 'repeat').trim().toLowerCase().split(/\s+/)
    if (keywords[0] === 'repeat-x') return ['repeat', 'no-repeat']
    if (keywords[0] === 'repeat-y') return ['no-repeat', 'repeat']
    return [keywords[0], keywords[1] ?? keywords[0]]
  })()

  const isGradient = /^(repeating-)?(linear|radial|conic)-gradient\(/.test(
    image
  )
  if (!isGradient && !image.startsWith('url(')) {
    return buildColorLayer(id, image, left, top, width, height)
  }

  let src: string | undefined
  let imageWidth = 0
  let imageHeight = 0
  if (!isGradient) {
    ;[src, imageWidth, imageHeight] = await resolveImageData(image.slice(4, -1))
  }

  const area = origin ?? { left, top, width, height }
  const dimensions = resolveSize(
    size,
    area.width,
    area.height,
    imageWidth,
    imageHeight,
    inheritableStyle,
    !src || hasIntrinsicSize(src)
  )

  // `round` scales images to repeat a whole number of times, keeping the
  // ratio if the other size is `auto`.
  const [widthValue, heightValue = 'auto'] = (size || 'auto')
    .trim()
    .toLowerCase()
    .split(/\s+/)
  const roundSize = (imageSize: number, areaSize: number) =>
    areaSize / Math.max(1, Math.round(areaSize / imageSize))
  if (repeatX === 'round' && dimensions[0] > 0) {
    const rounded = roundSize(dimensions[0], area.width)
    if (repeatY !== 'round' && heightValue === 'auto') {
      dimensions[1] *= rounded / dimensions[0]
    }
    dimensions[0] = rounded
  }
  if (repeatY === 'round' && dimensions[1] > 0) {
    const rounded = roundSize(dimensions[1], area.height)
    if (repeatX !== 'round' && widthValue === 'auto') {
      dimensions[0] *= rounded / dimensions[1]
    }
    dimensions[1] = rounded
  }

  const resolvedPosition = resolvePosition(
    position,
    area.width - dimensions[0],
    area.height - dimensions[1],
    inheritableStyle
  )

  // The offset of the first image from the box, and the distance between
  // images. `space` repeats images that fit from edge to edge.
  const tile = (
    keyword: string,
    imageSize: number,
    areaSize: number,
    areaOffset: number,
    boxSize: number,
    offset: number
  ): [number, number] => {
    const count = imageSize > 0 ? Math.floor(areaSize / imageSize) : 0
    if (keyword === 'space' && count > 1) {
      return [
        areaOffset,
        imageSize + (areaSize - count * imageSize) / (count - 1),
      ]
    }
    if (keyword === 'no-repeat' || keyword === 'space') {
      // Large enough to not repeat the image in the box.
      return [
        areaOffset + offset,
        boxSize + Math.abs(areaOffset + offset) + imageSize,
      ]
    }
    return [areaOffset + offset, imageSize]
  }
  const [offsetX, tileX] = tile(
    repeatX,
    dimensions[0],
    area.width,
    area.left - left,
    width,
    resolvedPosition[0]
  )
  const [offsetY, tileY] = tile(
    repeatY,
    dimensions[1],
    area.height,
    area.top - top,
    height,
    resolvedPosition[1]
  )
  const offsets = [offsetX, offsetY]
  const tiles: [number, number] = [tileX, tileY]

  if (/^(repeating-)?conic-gradient\(/.test(image)) {
    return buildConicGradient(
      { id, width, height, tiles },
      image,
      dimensions,
      offsets,
      inheritableStyle,
      from
    )
  }

  if (image.includes('linear-gradient(')) {
    return buildLinearGradient(
      { id, width, height, tiles },
      image,
      dimensions,
      offsets,
      inheritableStyle,
      from
    )
  }

  if (isGradient) {
    return buildRadialGradient(
      { id, width, height, tiles },
      image,
      dimensions,
      offsets,
      inheritableStyle,
      from
    )
  }

  const [resolvedWidth, resolvedHeight] = dimensions
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
        width: tiles[0],
        height: tiles[1],
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

/**
 * A color as an image, which Satori supports in `background-image` lists.
 */
function buildColorLayer(
  id: string,
  image: string,
  left: number,
  top: number,
  width: number,
  height: number
) {
  if (isColor(image)) {
    const color = image

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
