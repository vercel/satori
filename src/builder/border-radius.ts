/**
 * CSS border radius to SVG path.
 */

// TODO: Support the `border-radius: 10px / 20px` syntax.
// https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius

import { buildXMLString, lengthToNumber } from '../utils.js'
import { parseCornerShapeValue } from '../parser/corner-shape.js'

// Getting the intersection of a 45deg ray with the elliptical arc x^2/rx^2 + y^2/ry^2 = 1.
// Reference:
// https://www.w3.org/TR/SVG/implnote.html#ArcConversionEndpointToCenter
function svgArcCenterOffset([rx, ry]: number[]) {
  if (Math.round(rx * 1000) === 0 && Math.round(ry * 1000) === 0) {
    return 0
  }
  return Math.round(((rx * ry) / Math.sqrt(rx * rx + ry * ry)) * 1000) / 1000
}

function resolveSize(a: number, b: number, limit: number) {
  if (limit < a + b) {
    if (limit / 2 < a && limit / 2 < b) {
      a = b = limit / 2
    } else if (limit / 2 < a) {
      a = limit - b
    } else if (limit / 2 < b) {
      b = limit - a
    }
  }
  return [a, b]
}

function makeSmaller(arr: [number, number]) {
  arr[0] = arr[1] = Math.min(arr[0], arr[1])
}

// Each corner can have 2 values, the first is the horizontal radius, the second is the vertical radius.
function resolveRadius(
  v: number | string | undefined,
  width: number,
  height: number,
  fontSize: number,
  style: any
): [boolean, undefined | [number, number]] {
  if (typeof v === 'string') {
    const sides = v.split(' ').map((s) => s.trim())
    const singleValue = !sides[1] && !sides[0].endsWith('%')
    sides[1] = sides[1] || sides[0]
    return [
      singleValue,
      [
        Math.min(lengthToNumber(sides[0], fontSize, width, style, true), width),
        Math.min(
          lengthToNumber(sides[1], fontSize, height, style, true),
          height
        ),
      ],
    ]
  }
  if (typeof v === 'number') {
    return [true, [Math.min(v, width), Math.min(v, height)]]
  }
  return [true, undefined]
}

const radiusZeroOrNull = (_radius?: [number, number]) =>
  _radius && _radius[0] !== 0 && _radius[1] !== 0

function resolveCornerShape(value: unknown) {
  if (typeof value !== 'string') return 1
  return parseCornerShapeValue(value)
}

type Point = [number, number]

function cornerPoints(
  start: Point,
  end: Point,
  outer: Point,
  center: Point,
  shape: number
) {
  if (shape === Infinity) return [start, outer, end]
  if (shape === -Infinity) return [start, center, end]
  if (shape === 0) {
    return [
      start,
      [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2] as Point,
      end,
    ]
  }

  const curveCenter = shape < 0 ? outer : center
  const exponent = Math.pow(2, 1 - Math.abs(shape))
  if (exponent === 0)
    return shape > 0 ? [start, outer, end] : [start, center, end]
  const points: Point[] = []
  const segments = 16

  for (let i = 0; i <= segments; i++) {
    const angle = (Math.PI * i) / segments / 2
    const x = Math.pow(Math.sin(angle), exponent)
    const y = Math.pow(Math.cos(angle), exponent)
    points.push([
      curveCenter[0] +
        (end[0] - curveCenter[0]) * x +
        (start[0] - curveCenter[0]) * y,
      curveCenter[1] +
        (end[1] - curveCenter[1]) * x +
        (start[1] - curveCenter[1]) * y,
    ])
  }

  return points
}

function pointString(point: Point) {
  return `${Math.round(point[0] * 1000) / 1000},${
    Math.round(point[1] * 1000) / 1000
  }`
}

function oppositeRadiiScale(
  first: [number, number],
  second: [number, number],
  width: number,
  height: number
) {
  return Math.min(
    1,
    width / (first[0] + second[0] || width),
    height / (first[1] + second[1] || height)
  )
}

function shapedRadiusPath(
  left: number,
  top: number,
  width: number,
  height: number,
  radii: [number, number][],
  shapes: number[],
  partialSides?: boolean[]
) {
  if (partialSides?.every(Boolean)) partialSides = undefined

  const right = left + width
  const bottom = top + height
  const [topLeft, topRight, bottomRight, bottomLeft] = radii
  const corners = [
    cornerPoints(
      [left, top + topLeft[1]],
      [left + topLeft[0], top],
      [left, top],
      [left + topLeft[0], top + topLeft[1]],
      shapes[0]
    ),
    cornerPoints(
      [right - topRight[0], top],
      [right, top + topRight[1]],
      [right, top],
      [right - topRight[0], top + topRight[1]],
      shapes[1]
    ),
    cornerPoints(
      [right, bottom - bottomRight[1]],
      [right - bottomRight[0], bottom],
      [right, bottom],
      [right - bottomRight[0], bottom - bottomRight[1]],
      shapes[2]
    ),
    cornerPoints(
      [left + bottomLeft[0], bottom],
      [left, bottom - bottomLeft[1]],
      [left, bottom],
      [left + bottomLeft[0], bottom - bottomLeft[1]],
      shapes[3]
    ),
  ]

  if (partialSides) {
    let start = partialSides.indexOf(true)
    if (start === -1) throw new Error('Invalid `partialSides`.')
    while (partialSides[(start + 3) % 4]) start = (start + 3) % 4

    const firstCorner = corners[start]
    const firstMiddle = Math.floor(firstCorner.length / 2)
    let path = `M${pointString(firstCorner[firstMiddle])}`
    let side = start

    do {
      const currentCorner = corners[side]
      const currentMiddle = Math.floor(currentCorner.length / 2)
      for (let i = currentMiddle + 1; i < currentCorner.length; i++) {
        path += ` L${pointString(currentCorner[i])}`
      }

      const nextCorner = corners[(side + 1) % 4]
      path += ` L${pointString(nextCorner[0])}`
      const nextMiddle = Math.floor(nextCorner.length / 2)
      for (let i = 1; i <= nextMiddle; i++) {
        path += ` L${pointString(nextCorner[i])}`
      }

      side = (side + 1) % 4
    } while (partialSides[side] && side !== start)

    return path
  }

  let path = `M${pointString(corners[0][corners[0].length - 1])}`
  for (let side = 0; side < 4; side++) {
    const nextCorner = corners[(side + 1) % 4]
    path += ` L${pointString(nextCorner[0])}`
    for (let i = 1; i < nextCorner.length; i++) {
      path += ` L${pointString(nextCorner[i])}`
    }
  }
  return path + ' Z'
}

export function getBorderRadiusClipPath(
  {
    id,
    borderRadiusPath,
    borderType,
    left,
    top,
    width,
    height,
  }: {
    id: string
    borderRadiusPath?: string
    borderType?: 'rect' | 'path'
    left: number
    top: number
    width: number
    height: number
  },
  style: Record<string, number | string>
) {
  const rectClipId = `satori_brc-${id}`
  const defs = buildXMLString(
    'clipPath',
    {
      id: rectClipId,
    },
    buildXMLString(borderType, {
      x: left,
      y: top,
      width,
      height,
      d: borderRadiusPath ? borderRadiusPath : undefined,
    })
  )

  return [defs, rectClipId]
}

export default function radius(
  {
    left,
    top,
    width,
    height,
  }: {
    left: number
    top: number
    width: number
    height: number
  },
  style: Record<string, any>,
  partialSides?: boolean[]
) {
  let {
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
    fontSize,
  } = style
  const cornerShapes = [
    resolveCornerShape(style.cornerTopLeftShape),
    resolveCornerShape(style.cornerTopRightShape),
    resolveCornerShape(style.cornerBottomRightShape),
    resolveCornerShape(style.cornerBottomLeftShape),
  ]

  let singleAbsValueTopLeftCorner
  let singleAbsValueTopRightCorner
  let singleAbsValueBottomLeftCorner
  let singleAbsValueBottomRightCorner
  ;[singleAbsValueTopLeftCorner, borderTopLeftRadius] = resolveRadius(
    borderTopLeftRadius,
    width,
    height,
    fontSize,
    style
  )
  ;[singleAbsValueTopRightCorner, borderTopRightRadius] = resolveRadius(
    borderTopRightRadius,
    width,
    height,
    fontSize,
    style
  )
  ;[singleAbsValueBottomLeftCorner, borderBottomLeftRadius] = resolveRadius(
    borderBottomLeftRadius,
    width,
    height,
    fontSize,
    style
  )
  ;[singleAbsValueBottomRightCorner, borderBottomRightRadius] = resolveRadius(
    borderBottomRightRadius,
    width,
    height,
    fontSize,
    style
  )

  if (
    !partialSides &&
    !radiusZeroOrNull(borderTopLeftRadius) &&
    !radiusZeroOrNull(borderTopRightRadius) &&
    !radiusZeroOrNull(borderBottomLeftRadius) &&
    !radiusZeroOrNull(borderBottomRightRadius)
  ) {
    return ''
  }
  borderTopLeftRadius ||= [0, 0]
  borderTopRightRadius ||= [0, 0]
  borderBottomLeftRadius ||= [0, 0]
  borderBottomRightRadius ||= [0, 0]

  // Limit the radius sizes of each edge to make sure they will never overlap.

  // Top
  ;[borderTopLeftRadius[0], borderTopRightRadius[0]] = resolveSize(
    borderTopLeftRadius[0],
    borderTopRightRadius[0],
    width
  )
  // Bottom
  ;[borderBottomLeftRadius[0], borderBottomRightRadius[0]] = resolveSize(
    borderBottomLeftRadius[0],
    borderBottomRightRadius[0],
    width
  )
  // Left
  ;[borderTopLeftRadius[1], borderBottomLeftRadius[1]] = resolveSize(
    borderTopLeftRadius[1],
    borderBottomLeftRadius[1],
    height
  )
  // Right
  ;[borderTopRightRadius[1], borderBottomRightRadius[1]] = resolveSize(
    borderTopRightRadius[1],
    borderBottomRightRadius[1],
    height
  )

  // If the specified border radius is a single value (e.g. 10px or 10em), we take
  // the minimum of the resolved horizontal and vertical radius and apply to both.
  if (singleAbsValueTopLeftCorner) {
    makeSmaller(borderTopLeftRadius)
  }
  if (singleAbsValueTopRightCorner) {
    makeSmaller(borderTopRightRadius)
  }
  if (singleAbsValueBottomLeftCorner) {
    makeSmaller(borderBottomLeftRadius)
  }
  if (singleAbsValueBottomRightCorner) {
    makeSmaller(borderBottomRightRadius)
  }

  if (cornerShapes.some((shape) => shape < 0)) {
    const scale = Math.min(
      oppositeRadiiScale(
        borderTopLeftRadius,
        borderBottomRightRadius,
        width,
        height
      ),
      oppositeRadiiScale(
        borderTopRightRadius,
        borderBottomLeftRadius,
        width,
        height
      )
    )
    if (scale < 1) {
      for (const corner of [
        borderTopLeftRadius,
        borderTopRightRadius,
        borderBottomRightRadius,
        borderBottomLeftRadius,
      ]) {
        corner[0] *= scale
        corner[1] *= scale
      }
    }
  }

  if (cornerShapes.some((shape) => shape !== 1)) {
    return shapedRadiusPath(
      left,
      top,
      width,
      height,
      [
        borderTopLeftRadius,
        borderTopRightRadius,
        borderBottomRightRadius,
        borderBottomLeftRadius,
      ],
      cornerShapes,
      partialSides
    )
  }

  type Arc = [[number, number], [number, number]]
  const p: Arc[] = []
  p[0] = [borderTopRightRadius, borderTopRightRadius]
  p[1] = [
    borderBottomRightRadius,
    [-borderBottomRightRadius[0], borderBottomRightRadius[1]],
  ]
  p[2] = [
    borderBottomLeftRadius,
    [-borderBottomLeftRadius[0], -borderBottomLeftRadius[1]],
  ]
  p[3] = [
    borderTopLeftRadius,
    [borderTopLeftRadius[0], -borderTopLeftRadius[1]],
  ]

  const T = `h${width - borderTopLeftRadius[0] - borderTopRightRadius[0]} a${
    p[0][0]
  } 0 0 1 ${p[0][1]}`
  const R = `v${
    height - borderTopRightRadius[1] - borderBottomRightRadius[1]
  } a${p[1][0]} 0 0 1 ${p[1][1]}`
  const B = `h${
    borderBottomRightRadius[0] + borderBottomLeftRadius[0] - width
  } a${p[2][0]} 0 0 1 ${p[2][1]}`
  const L = `v${borderBottomLeftRadius[1] + borderTopLeftRadius[1] - height} a${
    p[3][0]
  } 0 0 1 ${p[3][1]}`

  if (partialSides) {
    // "However it is not defined what these transitions look like or what function maps from this ratio to a point on the curve."
    // https://w3c.github.io/csswg-drafts/css-backgrounds-3/#corner-transitions
    let start = partialSides.indexOf(false)

    if (!partialSides.includes(true)) throw new Error('Invalid `partialSides`.')

    if (start === -1) {
      start = 0
    } else {
      while (!partialSides[start]) {
        start = (start + 1) % 4
      }
    }

    function getArc(i: number) {
      const c0 = svgArcCenterOffset(
        [
          borderTopLeftRadius,
          borderTopRightRadius,
          borderBottomRightRadius,
          borderBottomLeftRadius,
        ][i]
      )
      return i === 0
        ? [
            [
              left + borderTopLeftRadius[0] - c0,
              top + borderTopLeftRadius[1] - c0,
            ],
            [left + borderTopLeftRadius[0], top],
          ]
        : i === 1
        ? [
            [
              left + width - borderTopRightRadius[0] + c0,
              top + borderTopRightRadius[1] - c0,
            ],
            [left + width, top + borderTopRightRadius[1]],
          ]
        : i === 2
        ? [
            [
              left + width - borderBottomRightRadius[0] + c0,
              top + height - borderBottomRightRadius[1] + c0,
            ],
            [left + width - borderBottomRightRadius[0], top + height],
          ]
        : [
            [
              left + borderBottomLeftRadius[0] - c0,
              top + height - borderBottomLeftRadius[1] + c0,
            ],
            [left, top + height - borderBottomLeftRadius[1]],
          ]
    }

    let result = ''

    const arc0 = getArc(start)

    let l = `M${arc0[0]} A${p[(start + 3) % 4][0]} 0 0 1 ${arc0[1]}`

    let len = 0
    for (; len < 4 && partialSides[(start + len) % 4]; len++) {
      result += l + ' '
      l = [T, R, B, L][(start + len) % 4]
    }
    const end = (start + len) % 4

    // For the last segment, we skip the full arc and add the half arc.
    result += l.split(' ')[0]

    const arc1 = getArc(end)
    result += ` A${p[(end + 3) % 4][0]} 0 0 1 ${arc1[0]}`

    return result
  }

  // Generate the path
  return `M${left + borderTopLeftRadius[0]},${top} ${T} ${R} ${B} ${L}`
}
