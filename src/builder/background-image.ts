import CssDimension from '../vendor/parse-css-dimension'
import { buildXMLString } from '../utils'

import gradient from '../vendor/gradient-parser'
import { resolveImageData } from '../handler/image'

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
  { id, width, height }: { id: string; width: number; height: number },
  { image, size, position, repeat }: Background
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
    const [xDelta, yDelta] = dimensions

    // Calculate the direction.
    let x1, y1, x2, y2
    if (parsed.orientation.type === 'directional') {
      ;[x1, y1, x2, y2] = {
        top: [0, 1, 0, 0],
        bottom: [0, 0, 0, 1],
        left: [1, 0, 0, 0],
        right: [0, 0, 1, 0],
      }[parsed.orientation.value]
    } else if (parsed.orientation.type === 'angular') {
      const angle = (+parsed.orientation.value / 180) * Math.PI - Math.PI / 2
      const c = Math.cos(angle)
      const s = Math.sin(angle)

      x1 = 0
      y1 = 0
      x2 = c
      y2 = s
      if (x2 < 0) {
        x1 -= x2
        x2 = 0
      }
      if (y2 < 0) {
        y1 -= y2
        y2 = 0
      }
    }

    const stops = normalizeStops(width, parsed.colorStops)

    const gradientId = `satori_bi${id}`
    const patternId = `satori_pattern_${id}`

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
          width: xDelta,
          height: yDelta,
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
        cx = orientation.at.value.x.value
        cy = orientation.at.value.y.value
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
    const spread: Record<string, number> = {}

    // Farest corner.
    const fx = Math.max(Math.abs(xDelta - cx), Math.abs(cx))
    const fy = Math.max(Math.abs(yDelta - cy), Math.abs(cy))
    if (shape === 'circle') {
      spread.r = Math.sqrt(fx * fx + fy * fy)
    } else if (shape === 'ellipse') {
      // Spec: https://drafts.csswg.org/css-images/#typedef-size
      // Get the aspect ratio of the closest-side size.
      const ratio = fy !== 0 ? fx / fy : 1

      // fx^2/a^2 + fy^2/b^2 = 1
      // fx^2/(b*ratio)^2 + fy^2/b^2 = 1
      // (fx^2+fy^2*ratio^2) = (b*ratio)^2
      // b = sqrt(fx^2+fy^2*ratio^2)/ratio
      spread.ry = Math.sqrt(fx * fx + fy * fy * ratio * ratio) / ratio
      spread.rx = spread.ry * ratio
    }

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
          x: offsets[0],
          y: offsets[1],
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
