import { buildXMLString } from '../utils.js'
import radius, { resolveCornerShape } from './border-radius.js'

function compareBorderDirections(a: string, b: string, style: any) {
  return (
    style[a + 'Width'] === style[b + 'Width'] &&
    style[a + 'Style'] === style[b + 'Style'] &&
    style[a + 'Color'] === style[b + 'Color']
  )
}

export function getBorderClipPath(
  {
    id,
    // Can be `overflow: hidden` from parent containers.
    currentClipPathId,
    borderPath,
    borderType,
    left,
    top,
    width,
    height,
  }: {
    id: string
    currentClipPathId?: string | number
    borderPath?: string
    borderType?: 'rect' | 'path'
    left: number
    top: number
    width: number
    height: number
  },
  style: Record<string, number | string>
) {
  const hasBorder =
    style.borderTopWidth ||
    style.borderRightWidth ||
    style.borderBottomWidth ||
    style.borderLeftWidth

  if (!hasBorder) return null

  // In SVG, stroke is always centered on the path and there is no
  // existing property to make it behave like CSS border. So here we
  // 2x the border width and introduce another clip path to clip the
  // overflowed part.
  const rectClipId = `satori_bc-${id}`
  const defs = buildXMLString(
    'clipPath',
    {
      id: rectClipId,
      'clip-path': currentClipPathId ? `url(#${currentClipPathId})` : undefined,
    },
    buildXMLString(borderType, {
      x: left,
      y: top,
      width,
      height,
      d: borderPath ? borderPath : undefined,
    })
  )

  return [defs, rectClipId]
}

/**
 * The region of a group of adjacent sides of a box. Sides are split at the
 * lines from the outer to the inner corners like CSS, and extend into the box
 * to include the strokes of rounded corners.
 */
function sidesRegion(
  sides: boolean[],
  left: number,
  top: number,
  width: number,
  height: number,
  style: Record<string, number | string>
) {
  const [t, r, b, l] = ['Top', 'Right', 'Bottom', 'Left'].map(
    (side) => (style[`border${side}Width`] as number) || 0
  )
  const scale = Math.min(
    t + b ? height / (t + b) : Infinity,
    l + r ? width / (l + r) : Infinity
  )
  const right = left + width
  const bottom = top + height
  // The corners where each side starts, clockwise from the top left.
  const outer = [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ]
  // The inner corners, moved towards the center.
  const inner = [
    [left + l * scale, top + t * scale],
    [right - r * scale, top + t * scale],
    [right - r * scale, bottom - b * scale],
    [left + l * scale, bottom - b * scale],
  ]

  // The first side of the group, after a side that isn't in it.
  const first = sides.findIndex((side, i) => side && !sides[(i + 3) % 4])
  const count = sides.filter(Boolean).length
  const points = []
  for (let i = 0; i <= count; i++) points.push(outer[(first + i) % 4])
  for (let i = count; i >= 0; i--) points.push(inner[(first + i) % 4])
  return points.map((point) => point.join(',')).join(' ')
}

export default function border(
  {
    id,
    left,
    top,
    width,
    height,
    props,
    asContentMask,
    maskBorderOnly,
  }: {
    id?: string
    left: number
    top: number
    width: number
    height: number
    props: any
    asContentMask?: boolean
    maskBorderOnly?: boolean
  },
  style: Record<string, number | string>
) {
  const directions = ['borderTop', 'borderRight', 'borderBottom', 'borderLeft']

  // No border
  if (
    !asContentMask &&
    !directions.some((direction) => style[direction + 'Width'])
  )
    return ''

  let fullBorder = ''

  // Sides with different styles meet diagonally at the corners, so each
  // group of sides is clipped to its region.
  const splitCorners =
    !asContentMask &&
    id !== undefined &&
    directions.some(
      (d, i) => !compareBorderDirections(d, directions[(i + 1) % 4], style)
    )
  let group = 0
  let ring = ''
  let ringId = ''
  let maxWidth = 0
  // The inner edge of shaped corners isn't known, so their sides keep their
  // own widths.
  const roundCorners = [
    'cornerTopLeftShape',
    'cornerTopRightShape',
    'cornerBottomRightShape',
    'cornerBottomLeftShape',
  ].every((name) => resolveCornerShape(style[name]) === 1)
  if (splitCorners && roundCorners) {
    const widths = ['Top', 'Right', 'Bottom', 'Left'].map(
      (side) => (style[`border${side}Width`] as number) || 0
    )
    maxWidth = Math.max(...widths)
    const rect = (x: number, y: number, w: number, h: number) =>
      `M${x},${y}h${w}v${h}h${-w}z`
    const box = { left, top, width, height }
    const radiusStyle = style as Record<string, number>
    const outer = radius(box, radiusStyle) || rect(left, top, width, height)
    const inner =
      radius(box, radiusStyle, undefined, false, widths) ||
      rect(
        left + widths[3],
        top + widths[0],
        Math.max(0, width - widths[1] - widths[3]),
        Math.max(0, height - widths[0] - widths[2])
      )
    // The area of the border, between the outer and inner edges.
    ringId = `satori_br-${id}`
    ring = buildXMLString(
      'clipPath',
      { id: ringId },
      buildXMLString('path', {
        d: `${outer} ${inner}`,
        'clip-rule': 'evenodd',
      })
    )
  }
  const drawSides = (sides: boolean[], attributes: Record<string, any>) => {
    if (!splitCorners) return buildXMLString('path', attributes)
    const clipId = `satori_bs-${id}-${group++}`
    const { transform, ...rest } = attributes
    // Draw the whole corners, clipped where the sides meet and to the area of
    // the border, so the width changes along the corners like CSS.
    rest.d = radius(
      { left, top, width, height },
      style as Record<string, number>,
      sides,
      true
    )
    if (ringId) rest['stroke-width'] = maxWidth * 2
    return (
      buildXMLString(
        'defs',
        {},
        (group === 1 ? ring : '') +
          buildXMLString(
            'clipPath',
            { id: clipId },
            buildXMLString('polygon', {
              points: sidesRegion(sides, left, top, width, height, style),
            })
          )
      ) +
      buildXMLString(
        'g',
        { transform, 'clip-path': `url(#${clipId})` },
        ringId
          ? buildXMLString(
              'g',
              { 'clip-path': `url(#${ringId})` },
              buildXMLString('path', rest)
            )
          : buildXMLString('path', rest)
      )
    )
  }

  // Start after a change of style, so sides with the same style are drawn
  // together.
  let start = 0
  for (
    let i = 0;
    i < 3 &&
    compareBorderDirections(
      directions[start],
      directions[(start + 3) % 4],
      style
    );
    i++
  ) {
    start = (start + 3) % 4
  }

  let partialSides = [false, false, false, false]
  let currentStyle = []
  for (let _i = 0; _i < 4; _i++) {
    const i = (start + _i) % 4
    const ni = (start + _i + 1) % 4

    const d = directions[i]
    const nd = directions[ni]

    partialSides[i] = true
    currentStyle = [
      style[d + 'Width'],
      style[d + 'Style'],
      style[d + 'Color'],
      d,
    ]

    if (!compareBorderDirections(d, nd, style)) {
      const w =
        (currentStyle[0] || 0) +
        (asContentMask && !maskBorderOnly
          ? style[d.replace('border', 'padding')] || 0
          : 0)
      if (w) {
        fullBorder += drawSides(partialSides, {
          width,
          height,
          ...props,
          fill: 'none',
          stroke: asContentMask ? '#000' : currentStyle[2],
          'stroke-width': w * 2,
          'stroke-dasharray':
            !asContentMask && currentStyle[1] === 'dashed'
              ? w * 2 + ' ' + w
              : undefined,
          d: radius(
            { left, top, width, height },
            style as Record<string, number>,
            partialSides
          ),
        })
      }
      partialSides = [false, false, false, false]
    }
  }

  if (partialSides.some(Boolean)) {
    const w =
      (currentStyle[0] || 0) +
      (asContentMask && !maskBorderOnly
        ? style[currentStyle[3].replace('border', 'padding')] || 0
        : 0)
    if (w) {
      fullBorder += drawSides(partialSides, {
        width,
        height,
        ...props,
        fill: 'none',
        stroke: asContentMask ? '#000' : currentStyle[2],
        'stroke-width': w * 2,
        'stroke-dasharray':
          !asContentMask && currentStyle[1] === 'dashed'
            ? w * 2 + ' ' + w
            : undefined,
        d: radius(
          { left, top, width, height },
          style as Record<string, number>,
          partialSides
        ),
      })
    }
  }

  return fullBorder
}
