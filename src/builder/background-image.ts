import CssDimension from '../vendor/parse-css-dimension/index.js'
import { buildXMLString, lengthToNumber } from '../utils.js'

import gradient from '../vendor/gradient-parser/index.js'
import { resolveImageData } from '../handler/image.js'

interface Background {
  attachment: string
  color?: string
  clip: string
  image: string
  origin: string
  position: string
  size: string
  repeat: string
}

function resolveColorFromStop(stop) {
  if (stop.type === 'literal') return stop.value
  if (stop.type === 'hex') return `#${stop.value}`
  if (stop.type === 'rgb') return `rgb(${stop.value.join(',')})`
  if (stop.type === 'rgba') return `rgba(${stop.value.join(',')})`
  return 'transparent'
}

function resolveXYFromDirection(dir: string) {
  let x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0

  if (dir.includes('top')) {
    y1 = 1
  } else if (dir.includes('bottom')) {
    y2 = 1
  }

  if (dir.includes('left')) {
    x1 = 1
  } else if (dir.includes('right')) {
    x2 = 1
  }

  if (!x1 && !x2 && !y1 && !y2) {
    y1 = 1
  }

  return [x1, y1, x2, y2]
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

function normalizeStops(totalLength: number, colorStops: any[]) {
  // Resolve the color stops based on the spec:
  // https://drafts.csswg.org/css-images/#color-stop-syntax
  const stops = []
  for (const stop of colorStops) {
    const color = resolveColorFromStop(stop)
    if (!stops.length) {
      // First stop, ensure it's at the start.
      stops.push({
        offset: 0,
        color,
      })

      if (typeof stop.length === 'undefined') continue
      if (stop.length.value === '0') continue
    }

    // All offsets are relative values (0-1) in SVG.
    const offset =
      typeof stop.length === 'undefined'
        ? undefined
        : stop.length.type === '%'
        ? stop.length.value / 100
        : stop.length.value / totalLength

    stops.push({
      offset,
      color,
    })
  }
  if (!stops.length) {
    stops.push({
      offset: 0,
      color: 'transparent',
    })
  }
  // Last stop, ensure it's at the end.
  const lastStop = stops[stops.length - 1]
  if (lastStop.offset !== 1) {
    if (typeof lastStop.offset === 'undefined') {
      lastStop.offset = 1
    } else {
      stops.push({
        offset: 1,
        color: lastStop.color,
      })
    }
  }

  let previousStop = 0
  let nextStop = 1
  // Evenly distribute the missing stop offsets.
  for (let i = 0; i < stops.length; i++) {
    if (typeof stops[i].offset === 'undefined') {
      // Find the next stop that has an offset.
      if (nextStop < i) nextStop = i
      while (typeof stops[nextStop].offset === 'undefined') nextStop++

      stops[i].offset =
        ((stops[nextStop].offset - stops[previousStop].offset) /
          (nextStop - previousStop)) *
          (i - previousStop) +
        stops[previousStop].offset
    } else {
      previousStop = i
    }
  }

  return stops
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
  inheritableStyle: Record<string, number | string>
): Promise<string[]> {
  // Default to `repeat`.
  repeat = repeat || 'repeat'

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

  if (image.startsWith('linear-gradient(')) {
    const parsed = gradient.parse(image)[0]
    const [imageWidth, imageHeight] = dimensions

    // Calculate the direction.
    let x1, y1, x2, y2, length

    if (parsed.orientation.type === 'directional') {
      ;[x1, y1, x2, y2] = resolveXYFromDirection(parsed.orientation.value)

      length = Math.sqrt(
        Math.pow((x2 - x1) * imageWidth, 2) +
          Math.pow((y2 - y1) * imageHeight, 2)
      )
    } else if (parsed.orientation.type === 'angular') {
      const EPS = 0.000001
      const r = imageWidth / imageHeight

      function calc(angle) {
        angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)

        if (Math.abs(angle - Math.PI / 2) < EPS) {
          x1 = 0
          y1 = 0
          x2 = 1
          y2 = 0
          length = imageWidth
          return
        } else if (Math.abs(angle) < EPS) {
          x1 = 0
          y1 = 1
          x2 = 0
          y2 = 0
          length = imageHeight
          return
        }

        // Assuming 0 <= angle < PI / 2.
        if (angle >= Math.PI / 2 && angle < Math.PI) {
          calc(Math.PI - angle)
          y1 = 1 - y1
          y2 = 1 - y2
          return
        } else if (angle >= Math.PI) {
          calc(angle - Math.PI)
          let tmp = x1
          x1 = x2
          x2 = tmp
          tmp = y1
          y1 = y2
          y2 = tmp
          return
        }

        // Remap SVG distortion
        const tan = Math.tan(angle)
        const tanTexture = tan * r
        const angleTexture = Math.atan(tanTexture)
        const l = Math.sqrt(2) * Math.cos(Math.PI / 4 - angleTexture)
        x1 = 0
        y1 = 1
        x2 = Math.sin(angleTexture) * l
        y2 = 1 - Math.cos(angleTexture) * l

        // Get the angle between the distored gradient direction and diagonal.
        const x = 1
        const y = 1 / tan
        const cosA = Math.abs(
          (x * r + y) / Math.sqrt(x * x + y * y) / Math.sqrt(r * r + 1)
        )

        // Get the distored gradient length.
        const diagonal = Math.sqrt(
          imageWidth * imageWidth + imageHeight * imageHeight
        )
        length = diagonal * cosA
      }

      calc((+parsed.orientation.value / 180) * Math.PI)
    }

    const stops = normalizeStops(length, parsed.colorStops)

    const gradientId = `satori_bi${id}`
    const patternId = `satori_pattern_${id}`

    const defs = buildXMLString(
      'pattern',
      {
        id: patternId,
        x: offsets[0] / width,
        y: offsets[1] / height,
        width: repeatX ? imageWidth / width : '1',
        height: repeatY ? imageHeight / height : '1',
        patternUnits: 'objectBoundingBox',
      },
      buildXMLString(
        'linearGradient',
        {
          id: gradientId,
          x1,
          y1,
          x2,
          y2,
        },
        stops
          .map((stop) =>
            buildXMLString('stop', {
              offset: stop.offset * 100 + '%',
              'stop-color': stop.color,
            })
          )
          .join('')
      ) +
        buildXMLString('rect', {
          x: 0,
          y: 0,
          width: imageWidth,
          height: imageHeight,
          fill: `url(#${gradientId})`,
        })
    )
    return [patternId, defs]
  }

  if (image.startsWith('radial-gradient(')) {
    const parsed = gradient.parse(image)[0]
    const orientation = parsed.orientation[0]
    const [xDelta, yDelta] = dimensions

    let shape = 'circle'
    let cx: number = xDelta / 2
    let cy: number = yDelta / 2

    if (orientation.type === 'shape') {
      shape = orientation.value
      if (!orientation.at) {
        // Defaults to center.
      } else if (orientation.at.type === 'position') {
        const pos = calcRadialGradient(
          orientation.at.value.x,
          orientation.at.value.y,
          xDelta,
          yDelta,
          inheritableStyle.fontSize as number,
          inheritableStyle
        )
        cx = pos.x
        cy = pos.y
      } else {
        throw new Error(
          'orientation.at.type not implemented: ' + orientation.at.type
        )
      }
    } else {
      throw new Error('orientation.type not implemented: ' + orientation.type)
    }

    const stops = normalizeStops(width, parsed.colorStops)

    const gradientId = `satori_radial_${id}`
    const patternId = `satori_pattern_${id}`
    const maskId = `satori_mask_${id}`

    // We currently only support `farthest-corner`:
    // https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient()#values
    const spread = calcRadius(
      shape as Shape,
      orientation.style,
      inheritableStyle.fontSize as number,
      { x: cx, y: cy },
      [xDelta, yDelta],
      inheritableStyle
    )

    // TODO: check for repeat-x/repeat-y
    const defs = buildXMLString(
      'pattern',
      {
        id: patternId,
        x: offsets[0] / width,
        y: offsets[1] / height,
        width: repeatX ? xDelta / width : '1',
        height: repeatY ? yDelta / height : '1',
        patternUnits: 'objectBoundingBox',
      },
      buildXMLString(
        'radialGradient',
        {
          id: gradientId,
        },
        stops
          .map((stop) =>
            buildXMLString('stop', {
              offset: stop.offset,
              'stop-color': stop.color,
            })
          )
          .join('')
      ) +
        buildXMLString(
          'mask',
          {
            id: maskId,
          },
          buildXMLString('rect', {
            x: 0,
            y: 0,
            width: xDelta,
            height: yDelta,
            fill: '#fff',
          })
        ) +
        buildXMLString('rect', {
          x: 0,
          y: 0,
          width: xDelta,
          height: yDelta,
          fill: stops.at(-1).color,
        }) +
        buildXMLString(shape, {
          cx: cx,
          cy: cy,
          width: xDelta,
          height: yDelta,
          ...spread,
          fill: `url(#${gradientId})`,
          mask: `url(#${maskId})`,
        })
    )

    const result = [patternId, defs]
    return result
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
    const resolvedWidth = dimensionsWithoutFallback[0] || imageWidth
    const resolvedHeight = dimensionsWithoutFallback[1] || imageHeight

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

type PositionKeyWord = 'center' | 'left' | 'right' | 'top' | 'bottom'
interface Position {
  type: string
  value: PositionKeyWord
}

function calcRadialGradient(
  cx: Position,
  cy: Position,
  xDelta: number,
  yDelta: number,
  baseFontSize: number,
  style: Record<string, string | number>
) {
  const pos: { x: number; y: number } = { x: xDelta / 2, y: yDelta / 2 }
  if (cx.type === 'position-keyword') {
    Object.assign(pos, calcPos(cx.value, xDelta, yDelta, 'x'))
  } else {
    pos.x = lengthToNumber(
      `${cx.value}${cx.type}`,
      baseFontSize,
      xDelta,
      style,
      true
    )
  }

  if (cy.type === 'position-keyword') {
    Object.assign(pos, calcPos(cy.value, xDelta, yDelta, 'y'))
  } else {
    pos.y = lengthToNumber(
      `${cy.value}${cy.type}`,
      baseFontSize,
      yDelta,
      style,
      true
    )
  }

  return pos
}

function calcPos(
  key: PositionKeyWord,
  xDelta: number,
  yDelta: number,
  dir: 'x' | 'y'
) {
  switch (key) {
    case 'center':
      return { [dir]: dir === 'x' ? xDelta / 2 : yDelta / 2 }
    case 'left':
      return { x: 0 }
    case 'top':
      return { y: 0 }
    case 'right':
      return { x: xDelta }
    case 'bottom':
      return { y: yDelta }
  }
}

type Shape = 'circle' | 'ellipse'
function calcRadius(
  shape: Shape,
  endingShape: Array<{ type: string; value: string }>,
  baseFontSize: number,
  centerAxis: { x: number; y: number },
  length: [number, number],
  inheritableStyle: Record<string, string | number>
) {
  const [xDelta, yDelta] = length
  const { x: cx, y: cy } = centerAxis
  const spread: Record<string, number> = {}
  let fx = 0
  let fy = 0
  const isExtentKeyWord = endingShape.some((v) => v.type === 'extent-keyword')

  if (!isExtentKeyWord) {
    if (endingShape.some((v) => v.value.startsWith('-'))) {
      throw new Error(
        'disallow setting negative values to the size of the shape. Check https://w3c.github.io/csswg-drafts/css-images/#valdef-rg-size-length-0'
      )
    }
    if (shape === 'circle') {
      return {
        r: lengthToNumber(
          `${endingShape[0].value}${endingShape[0].type}`,
          baseFontSize,
          xDelta,
          inheritableStyle,
          true
        ),
      }
    } else {
      return {
        rx: lengthToNumber(
          `${endingShape[0].value}${endingShape[0].type}`,
          baseFontSize,
          xDelta,
          inheritableStyle,
          true
        ),
        ry: lengthToNumber(
          `${endingShape[1].value}${endingShape[1].type}`,
          baseFontSize,
          yDelta,
          inheritableStyle,
          true
        ),
      }
    }
  }

  switch (endingShape[0].value) {
    case 'farthest-corner':
      fx = Math.max(Math.abs(xDelta - cx), Math.abs(cx))
      fy = Math.max(Math.abs(yDelta - cy), Math.abs(cy))
      break
    case 'closest-corner':
      fx = Math.min(Math.abs(xDelta - cx), Math.abs(cx))
      fy = Math.min(Math.abs(yDelta - cy), Math.abs(cy))
      break
    case 'farthest-side':
      if (shape === 'circle') {
        spread.r = Math.max(
          Math.abs(xDelta - cx),
          Math.abs(cx),
          Math.abs(yDelta - cy),
          Math.abs(cy)
        )
      } else {
        spread.rx = Math.max(Math.abs(xDelta - cx), Math.abs(cx))
        spread.ry = Math.max(Math.abs(yDelta - cy), Math.abs(cy))
      }
      return spread
    case 'closest-side':
      if (shape === 'circle') {
        spread.r = Math.min(
          Math.abs(xDelta - cx),
          Math.abs(cx),
          Math.abs(yDelta - cy),
          Math.abs(cy)
        )
      } else {
        spread.rx = Math.min(Math.abs(xDelta - cx), Math.abs(cx))
        spread.ry = Math.min(Math.abs(yDelta - cy), Math.abs(cy))
      }

      return spread
  }
  if (shape === 'circle') {
    spread.r = Math.sqrt(fx * fx + fy * fy)
  } else {
    // Spec: https://drafts.csswg.org/css-images/#typedef-size
    // Get the aspect ratio of the closest-side size.
    const ratio = fy !== 0 ? fx / fy : 1

    if (fx === 0) {
      spread.rx = 0
      spread.ry = 0
    } else {
      // fx^2/a^2 + fy^2/b^2 = 1
      // fx^2/(b*ratio)^2 + fy^2/b^2 = 1
      // (fx^2+fy^2*ratio^2) = (b*ratio)^2
      // b = sqrt(fx^2+fy^2*ratio^2)/ratio

      spread.ry = Math.sqrt(fx * fx + fy * fy * ratio * ratio) / ratio
      spread.rx = spread.ry * ratio
    }
  }

  return spread
}
