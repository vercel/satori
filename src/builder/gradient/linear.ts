import { parseLinearGradient, ColorStop } from 'css-gradient-parser'
import { normalizeStops } from './utils.js'
import { buildXMLString, calcDegree, lengthToNumber } from '../../utils.js'

export function buildLinearGradient(
  {
    id,
    width,
    height,
    repeatX,
    repeatY,
  }: {
    id: string
    width: number
    height: number
    repeatX: boolean
    repeatY: boolean
  },
  image: string,
  dimensions: number[],
  offsets: number[],
  inheritableStyle: Record<string, number | string>,
  from?: 'background' | 'mask'
) {
  const parsed = parseLinearGradient(image)
  const [imageWidth, imageHeight] = dimensions
  const repeating = image.startsWith('repeating')

  // Calculate the direction.
  let points, length, xys

  if (parsed.orientation.type === 'directional') {
    points = resolveXYFromDirection(parsed.orientation.value)

    length = Math.sqrt(
      Math.pow((points.x2 - points.x1) * imageWidth, 2) +
        Math.pow((points.y2 - points.y1) * imageHeight, 2)
    )
  } else if (parsed.orientation.type === 'angular') {
    const { length: l, ...p } = calcNormalPoint(
      (calcDegree(
        `${parsed.orientation.value.value}${parsed.orientation.value.unit}`
      ) /
        180) *
        Math.PI,
      imageWidth,
      imageHeight
    )

    length = l
    points = p
  }

  xys = repeating
    ? calcPercentage(parsed.stops, length, points, inheritableStyle)
    : points

  const stops = normalizeStops(
    repeating ? resolveRepeatingCycle(parsed.stops, length) : length,
    parsed.stops,
    inheritableStyle,
    repeating,
    from
  )

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
        ...xys,
        spreadMethod: repeating ? 'repeat' : 'pad',
      },
      stops
        .map((stop) =>
          buildXMLString('stop', {
            offset: (stop.offset ?? 0) * 100 + '%',
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

function resolveRepeatingCycle(stops: ColorStop[], length: number) {
  const last = stops[stops.length - 1]
  const { offset } = last
  if (!offset) return length

  if (offset.unit === '%') return (Number(offset.value) / 100) * length

  return Number(offset.value)
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

  return { x1, y1, x2, y2 }
}

/**
 * calc start point and end point of linear gradient
 */
function calcNormalPoint(v: number, w: number, h: number) {
  const r = Math.pow(h / w, 2)

  // make sure angle is 0 <= angle <= 360
  v = ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)

  let x1, y1, x2, y2, length, tmp, a, b

  const dfs = (angle: number) => {
    if (angle === 0) {
      x1 = 0
      y1 = h
      x2 = 0
      y2 = 0
      length = h
      return
    } else if (angle === Math.PI / 2) {
      x1 = 0
      y1 = 0
      x2 = w
      y2 = 0
      length = w
      return
    }
    if (angle > 0 && angle < Math.PI / 2) {
      x1 =
        ((r * w) / 2 / Math.tan(angle) - h / 2) /
        (Math.tan(angle) + r / Math.tan(angle))
      y1 = Math.tan(angle) * x1 + h
      x2 = Math.abs(w / 2 - x1) + w / 2
      y2 = h / 2 - Math.abs(y1 - h / 2)
      length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      // y = -1 / tan * x = h / 2 +1 / tan * w/2
      // y = tan * x + h
      a =
        (w / 2 / Math.tan(angle) - h / 2) /
        (Math.tan(angle) + 1 / Math.tan(angle))
      b = Math.tan(angle) * a + h
      length = 2 * Math.sqrt(Math.pow(w / 2 - a, 2) + Math.pow(h / 2 - b, 2))
      return
    } else if (angle > Math.PI / 2 && angle < Math.PI) {
      x1 =
        (h / 2 + (r * w) / 2 / Math.tan(angle)) /
        (Math.tan(angle) + r / Math.tan(angle))
      y1 = Math.tan(angle) * x1
      x2 = Math.abs(w / 2 - x1) + w / 2
      y2 = h / 2 + Math.abs(y1 - h / 2)
      // y = -1 / tan * x + h / 2 + 1 / tan * w / 2
      // y = tan * x
      a =
        (w / 2 / Math.tan(angle) + h / 2) /
        (Math.tan(angle) + 1 / Math.tan(angle))
      b = Math.tan(angle) * a
      length = 2 * Math.sqrt(Math.pow(w / 2 - a, 2) + Math.pow(h / 2 - b, 2))
      return
    } else if (angle >= Math.PI) {
      dfs(angle - Math.PI)

      tmp = x1
      x1 = x2
      x2 = tmp
      tmp = y1
      y1 = y2
      y2 = tmp
    }
  }

  dfs(v)

  return {
    x1: x1 / w,
    y1: y1 / h,
    x2: x2 / w,
    y2: y2 / h,
    length,
  }
}

function calcPercentage(
  stops: ColorStop[],
  length: number,
  points: {
    x1: number
    y1: number
    x2: number
    y2: number
  },
  inheritableStyle: Record<string, string | number>
) {
  const { x1, x2, y1, y2 } = points
  const p1 = !stops[0].offset
    ? 0
    : stops[0].offset.unit === '%'
    ? Number(stops[0].offset.value) / 100
    : lengthToNumber(
        `${stops[0].offset.value}${stops[0].offset.unit}`,
        inheritableStyle.fontSize as number,
        length,
        inheritableStyle,
        true
      ) / length
  const p2 = !stops.at(-1).offset
    ? 1
    : stops.at(-1).offset.unit === '%'
    ? Number(stops.at(-1).offset.value) / 100
    : lengthToNumber(
        `${stops.at(-1).offset.value}${stops.at(-1).offset.unit}`,
        inheritableStyle.fontSize as number,
        length,
        inheritableStyle,
        true
      ) / length

  const sx = (x2 - x1) * p1 + x1
  const sy = (y2 - y1) * p1 + y1
  const ex = (x2 - x1) * p2 + x1
  const ey = (y2 - y1) * p2 + y1

  return {
    x1: sx,
    y1: sy,
    x2: ex,
    y2: ey,
  }
}
