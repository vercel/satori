/**
 * CSS border radius to SVG path.
 */

// TODO: Support the `border-radius: 10px / 20px` syntax.
// https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius

import { buildXMLString, lengthToNumber } from '../utils.js'

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
