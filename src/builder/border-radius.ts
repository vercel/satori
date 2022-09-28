/**
 * CSS border radius to SVG path.
 */

// TODO: Support the `border-radius: 10px / 20px` syntax.
// https://developer.mozilla.org/en-US/docs/Web/CSS/border-radius

import { lengthToNumber } from '../utils'

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
  style: Record<string, any>
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
    !borderTopLeftRadius &&
    !borderTopRightRadius &&
    !borderBottomLeftRadius &&
    !borderBottomRightRadius
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

  // Generate the path
  return `M${left + borderTopLeftRadius[0]},${top} h${
    width - borderTopLeftRadius[0] - borderTopRightRadius[0]
  } a${borderTopRightRadius[0]},${borderTopRightRadius[1]} 0 0 1 ${
    borderTopRightRadius[0]
  },${borderTopRightRadius[1]} v${
    height - borderTopRightRadius[1] - borderBottomRightRadius[1]
  } a${borderBottomRightRadius[0]},${
    borderBottomRightRadius[1]
  } 0 0 1 ${-borderBottomRightRadius[0]},${borderBottomRightRadius[1]} h${
    borderBottomRightRadius[0] + borderBottomLeftRadius[0] - width
  } a${borderBottomLeftRadius[0]},${
    borderBottomLeftRadius[1]
  } 0 0 1 ${-borderBottomLeftRadius[0]},${-borderBottomLeftRadius[1]} v${
    borderBottomLeftRadius[1] + borderTopLeftRadius[1] - height
  } a${borderTopLeftRadius[0]},${borderTopLeftRadius[1]} 0 0 1 ${
    borderTopLeftRadius[0]
  },${-borderTopLeftRadius[1]}`
}
