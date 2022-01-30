/**
 * CSS border radius to SVG path.
 */

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
  style: Record<string, number>
) {
  let {
    borderTopLeftRadius,
    borderTopRightRadius,
    borderBottomLeftRadius,
    borderBottomRightRadius,
  } = style

  borderTopLeftRadius = Math.min(borderTopLeftRadius || 0, width, height)
  borderTopRightRadius = Math.min(borderTopRightRadius || 0, width, height)
  borderBottomLeftRadius = Math.min(borderBottomLeftRadius || 0, width, height)
  borderBottomRightRadius = Math.min(
    borderBottomRightRadius || 0,
    width,
    height
  )

  if (
    !borderTopLeftRadius &&
    !borderTopRightRadius &&
    !borderBottomLeftRadius &&
    !borderBottomRightRadius
  ) {
    return ''
  }

  // Limit the radius size.
  ;[borderTopLeftRadius, borderTopRightRadius] = resolveSize(
    borderTopLeftRadius,
    borderTopRightRadius,
    width
  )
  ;[borderTopLeftRadius, borderBottomLeftRadius] = resolveSize(
    borderTopLeftRadius,
    borderBottomLeftRadius,
    height
  )
  ;[borderTopRightRadius, borderBottomRightRadius] = resolveSize(
    borderTopRightRadius,
    borderBottomRightRadius,
    height
  )
  ;[borderBottomLeftRadius, borderBottomRightRadius] = resolveSize(
    borderBottomLeftRadius,
    borderBottomRightRadius,
    width
  )

  // Generate the path (GitHub Copilot wrote these for me).
  return `M${left + borderTopLeftRadius},${top} h${
    width - borderTopLeftRadius - borderTopRightRadius
  } a${borderTopRightRadius},${borderTopRightRadius} 0 0 1 ${borderTopRightRadius},${borderTopRightRadius} v${
    height - borderTopRightRadius - borderBottomRightRadius
  } a${borderBottomRightRadius},${borderBottomRightRadius} 0 0 1 ${-borderBottomRightRadius},${borderBottomRightRadius} h${
    borderBottomRightRadius + borderBottomLeftRadius - width
  } a${borderBottomLeftRadius},${borderBottomLeftRadius} 0 0 1 ${-borderBottomLeftRadius},${-borderBottomLeftRadius} v${
    borderBottomLeftRadius + borderTopLeftRadius - height
  } a${borderTopLeftRadius},${borderTopLeftRadius} 0 0 1 ${borderTopLeftRadius},${-borderTopLeftRadius}`
}
