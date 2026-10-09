import { parseColor } from '../parser/color.js'
import { buildXMLString } from '../utils.js'
import radius, {
  resolveBorderRadii,
  resolveCornerShape,
} from './border-radius.js'

const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const

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
 * lines from the outer to the inner corners, and extend into the box to
 * include the strokes of rounded corners.
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

// The squared distances from black of `#202020`, and from white of `#ebebeb`.
// Colors closer to black are lightened instead of darkened, and colors closer
// to white aren't lightened.
const NEAR_BLACK = 3 * 0x20 ** 2
const NEAR_WHITE = 3 * (0xff - 0xeb) ** 2

function scaleColor(rgb: number[], multiplier: number) {
  return rgb.map((c) => Math.floor((c / 255) * multiplier * 255.996))
}

function lighten(rgb: number[]) {
  const v = Math.max(...rgb) / 255
  if (v === 0) return [0x54, 0x54, 0x54]
  return scaleColor(rgb, Math.min(1, v + 0.33) / v)
}

function darken(rgb: number[]) {
  const v = Math.max(...rgb) / 255
  if (v === 0) return rgb
  return scaleColor(rgb, Math.max(0, (v - 0.33) / v))
}

/**
 * The dark and light shades of a color for the sides of `inset`, `outset`,
 * `groove` and `ridge` borders. CSS leaves them to the user agent, these are
 * the ones of Chrome.
 */
function shadeColor(color: string): [dark: string, light: string] {
  const parsed = parseColor(color)
  if (!parsed) return [color, color]
  const rgb = parsed.slice(0, 3).map(Math.round)
  const alpha = parsed[3]
  const distance = (to: number) =>
    rgb.reduce((sum, c) => sum + (c - to) ** 2, 0)
  let dark: number[]
  let light: number[]
  if (distance(0) <= NEAR_BLACK) {
    dark = lighten(rgb)
    light = lighten(dark)
  } else {
    dark = darken(rgb)
    light = distance(255) < NEAR_WHITE ? rgb : lighten(rgb)
  }
  const format = ([r, g, b]: number[]) =>
    alpha < 1 ? `rgba(${r},${g},${b},${alpha})` : `rgb(${r},${g},${b})`
  return [format(dark), format(light)]
}

interface BorderPass {
  style: Record<string, number | string>
  /** The inset of the outer edge, `[top, right, bottom, left]`. */
  offset: number[]
}

/**
 * Splits a border into passes of solid, dashed and dotted lines: `double`,
 * `groove` and `ridge` borders have an outer and an inner line, and `inset`,
 * `outset`, `groove` and `ridge` sides have shades of their color.
 */
function getBorderPasses(style: Record<string, number | string>) {
  const outer = { ...style }
  const inner = { ...style }
  const offset = [0, 0, 0, 0]
  let hasInner = false
  SIDES.forEach((side, i) => {
    const width = (style[`border${side}Width`] as number) || 0
    const lineStyle = style[`border${side}Style`] || 'solid'
    const color = style[`border${side}Color`] as string
    const isTopLeft = side === 'Top' || side === 'Left'
    let outerWidth = width
    let outerStyle = lineStyle
    let outerColor = color
    let innerWidth = 0
    let innerColor = color
    if (lineStyle === 'none' || lineStyle === 'hidden') {
      outerWidth = 0
    } else if (lineStyle === 'double') {
      // Two lines with a third of the width each, solid if they'd be thinner
      // than a pixel.
      outerStyle = 'solid'
      if (width >= 3) {
        innerWidth = outerWidth = Math.round(width / 3)
        offset[i] = width - innerWidth
      }
    } else if (lineStyle === 'groove' || lineStyle === 'ridge') {
      // Two halves with shades of the color, the outer one rounded up. A
      // line thinner than 2px is solid.
      outerStyle = 'solid'
      if (width >= 2) {
        const [dark, light] = shadeColor(color)
        const isDarkOutside = (lineStyle === 'groove') === isTopLeft
        outerWidth = offset[i] = Math.min(width, Math.ceil(width / 2))
        innerWidth = width - outerWidth
        outerColor = isDarkOutside ? dark : light
        innerColor = isDarkOutside ? light : dark
      }
    } else if (lineStyle === 'inset' || lineStyle === 'outset') {
      const [dark, light] = shadeColor(color)
      outerStyle = 'solid'
      outerColor = (lineStyle === 'inset') === isTopLeft ? dark : light
    }
    outer[`border${side}Width`] = outerWidth
    outer[`border${side}Style`] = outerStyle
    outer[`border${side}Color`] = outerColor
    inner[`border${side}Width`] = innerWidth
    inner[`border${side}Style`] = 'solid'
    inner[`border${side}Color`] = innerColor
    if (innerWidth) hasInner = true
  })
  const passes: BorderPass[] = [{ style: outer, offset: [0, 0, 0, 0] }]
  if (hasInner) passes.push({ style: inner, offset })
  return passes
}

const rectPath = (x: number, y: number, w: number, h: number) =>
  `M${x},${y}h${w}v${h}h${-w}z`

export default function border(
  options: {
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
  if (options.asContentMask) return drawBorder(options, style, style)

  const { id, left, top, width, height, props } = options
  let result = ''
  for (const [index, pass] of getBorderPasses(style).entries()) {
    if (!index) {
      result += drawBorder(options, pass.style, style)
      continue
    }
    // The inner line is clipped to its outer edge, like the outer line to the
    // edge of the box.
    const [t, r, b, l] = pass.offset
    const clipId = `satori_bc-${id}-inner`
    const edge =
      radius(
        { left, top, width, height },
        style,
        undefined,
        false,
        pass.offset
      ) || rectPath(left + l, top + t, width - l - r, height - t - b)
    result +=
      buildXMLString(
        'defs',
        {},
        buildXMLString(
          'clipPath',
          { id: clipId, 'clip-path': props['clip-path'] },
          buildXMLString('path', { d: edge })
        )
      ) +
      drawBorder(
        {
          ...options,
          id: `${id}-inner`,
          props: { ...props, 'clip-path': `url(#${clipId})` },
        },
        pass.style,
        style,
        pass.offset
      )
  }
  return result
}

/**
 * The gap between dashes, as close to `gap` as possible, so that an open path
 * starts and ends with a dash, and a closed path has whole dashes and gaps.
 * Like `SelectBestDashGap` of Chrome.
 */
function fitDashGap(length: number, dash: number, gap: number, closed = false) {
  const fewer = Math.floor((closed ? length : length + gap) / (dash + gap))
  const fewerGap = (length - fewer * dash) / (closed ? fewer : fewer - 1)
  const moreGap = (length - (fewer + 1) * dash) / (closed ? fewer + 1 : fewer)
  return moreGap <= 0 || Math.abs(fewerGap - gap) < Math.abs(moreGap - gap)
    ? fewerGap
    : moreGap
}

// A quarter of the perimeter of an ellipse, by Ramanujan's approximation.
const quarterArc = ([x, y]: number[]) =>
  (Math.PI * (3 * (x + y) - Math.sqrt((3 * x + y) * (x + 3 * y)))) / 4

/**
 * A closed path around a rounded box, inset by `inset`, and the lengths of its
 * sides and corners in order. Like in Chrome, it starts at the left end of the
 * top side and goes clockwise.
 */
function roundedContour(
  box: { left: number; top: number; width: number; height: number },
  style: Record<string, number | string>,
  inset: number[]
) {
  const left = box.left + inset[3]
  const top = box.top + inset[0]
  const right = box.left + box.width - inset[1]
  const bottom = box.top + box.height - inset[2]
  const [tl, tr, br, bl] = (resolveBorderRadii(box, style) || []).map(
    ([x, y], i) => [
      Math.max(0, x - inset[i % 3 === 0 ? 3 : 1]),
      Math.max(0, y - inset[i < 2 ? 0 : 2]),
    ]
  )
  const isRound = ([x, y]: number[]) => x > 0 && y > 0
  const arc = (corner: number[], toX: number, toY: number) =>
    isRound(corner)
      ? `A${corner[0]},${corner[1]} 0 0 1 ${toX},${toY}`
      : `L${toX},${toY}`
  const d =
    `M${left + tl[0]},${top}` +
    `H${right - tr[0]}` +
    arc(tr, right, top + tr[1]) +
    `V${bottom - br[1]}` +
    arc(br, right - br[0], bottom) +
    `H${left + bl[0]}` +
    arc(bl, left, bottom - bl[1]) +
    `V${top + tl[1]}` +
    arc(tl, left + tl[0], top) +
    'Z'
  const corner = (c: number[]) =>
    isRound(c) ? quarterArc(c) : Math.hypot(c[0], c[1])
  const segments = [
    right - tr[0] - left - tl[0],
    corner(tr),
    bottom - br[1] - top - tr[1],
    corner(br),
    right - br[0] - left - bl[0],
    corner(bl),
    bottom - bl[1] - top - tl[1],
    corner(tl),
  ].map((length) => Math.max(0, length))
  return { d, segments }
}

/**
 * The dashes of a closed path, like in Chrome: whole dashes and gaps, two
 * smaller dashes on short paths, and a solid line on shorter ones.
 */
function closedDashArray(length: number, dash: number, gap: number) {
  if (length <= dash * 2) return undefined
  if (length <= 2 * (dash + gap)) {
    const scale = length / (2 * (dash + gap))
    return `${dash * scale} ${gap * scale}`
  }
  return `${dash} ${fitDashGap(length, dash, gap, true)}`
}

/**
 * Draws a dotted or dashed side along the middle of the side. Dots are round,
 * or square if they're smaller than 3px, with a dot at each corner. Dashes are
 * twice as long as the width, or three times if it's smaller than 3px, with a
 * dash at each end, so they cover the corners together with the dashes of the
 * next sides. On rounded borders, dashes go around the whole border instead.
 */
function drawPatternedSide(
  side: number,
  lineStyle: 'dotted' | 'dashed',
  box: { left: number; top: number; width: number; height: number },
  style: Record<string, number | string>,
  offset: number[],
  attributes: Record<string, any>,
  /** Whether the line is clipped to the area of the border. */
  clipped = false
) {
  const widths = SIDES.map((s) => (style[`border${s}Width`] as number) || 0)
  const width = widths[side]
  const sides = [false, false, false, false]
  sides[side] = true

  if (lineStyle === 'dotted') {
    const inset = offset.map((o, i) => o + widths[i] / 2)
    const length =
      side % 2 === 0
        ? box.width - inset[1] - inset[3]
        : box.height - inset[0] - inset[2]
    const isRound = width >= 3
    const count = Math.max(1, Math.round(length / (2 * width)))
    return buildXMLString('path', {
      ...attributes,
      fill: 'none',
      'stroke-width': width,
      'stroke-linecap': isRound ? 'round' : undefined,
      'stroke-dasharray': isRound ? `0 ${length / count}` : `${width} ${width}`,
      // Square dots start at the edge of the box.
      'stroke-dashoffset': isRound ? undefined : width / 2,
      d: radius(box, style, sides, false, inset),
    })
  }

  const dash = width * (width >= 3 ? 2 : 3)
  const gap = width * (width >= 3 ? 1 : 2)
  // A line without room for two dashes is solid.
  const dasharray = (length: number) =>
    length > dash * 2 ? `${dash} ${fitDashGap(length, dash, gap)}` : undefined

  // Like in Chrome, dashes of rounded borders go around the whole border, and
  // each side shows the ones in its region. Chrome dashes a closed path inset
  // by half the widths rounded down, with its length rounded down, and draws
  // it wide enough to cover the border, clipped to it. The corners have the
  // same centers as those of the border, so the dashes are cut along the same
  // lines as if they were drawn along its middle.
  if (isRoundedBox(box, style)) {
    const half = (w: number) => (clipped ? Math.trunc(w / 2) : w / 2)
    const { d, segments } = roundedContour(
      box,
      style,
      offset.map((o, i) => o + half(widths[i]))
    )
    const length = segments.reduce((sum, segment) => sum + segment, 0)
    return buildXMLString('path', {
      ...attributes,
      fill: 'none',
      'stroke-width': clipped ? 2 * Math.max(...widths) : width,
      'stroke-dasharray': closedDashArray(Math.trunc(length), dash, gap),
      d,
    })
  }

  const center = offset.map((o, i) => o + widths[i] / 2)

  // Sides with shaped corners go from corner to corner, including the corners,
  // so the dashes at the ends of adjacent sides cover the corners together.
  const radii = resolveBorderRadii(box, style)?.map(([x, y], i) => [
    Math.max(0, x - center[i % 3 === 0 ? 3 : 1]),
    Math.max(0, y - center[i < 2 ? 0 : 2]),
  ])
  const corners = radii ? [radii[side], radii[(side + 1) % 4]] : []
  if (corners.some(([x, y]) => x > 0 && y > 0)) {
    const length =
      (side % 2 === 0 ? box.width : box.height) -
      center[(side + 3) % 4] -
      center[(side + 1) % 4] -
      corners.reduce(
        (sum, [x, y]) => sum + (side % 2 === 0 ? x : y) - quarterArc([x, y]),
        0
      )
    return buildXMLString('path', {
      ...attributes,
      fill: 'none',
      'stroke-width': width,
      'stroke-dasharray': dasharray(length),
      d: radius(box, style, sides, true, center),
    })
  }

  const [t, r, b, l] = offset
  const left = box.left + l
  const top = box.top + t
  const right = box.left + box.width - r
  const bottom = box.top + box.height - b
  const half = width / 2
  return buildXMLString('path', {
    ...attributes,
    fill: 'none',
    'stroke-width': width,
    'stroke-dasharray': dasharray(side % 2 === 0 ? right - left : bottom - top),
    d: [
      `M${left},${top + half}H${right}`,
      `M${right - half},${top}V${bottom}`,
      `M${right},${bottom - half}H${left}`,
      `M${left + half},${bottom}V${top}`,
    ][side],
  })
}

/** Whether a box has rounded corners, and none of another shape. */
const isRoundedBox = (
  box: { left: number; top: number; width: number; height: number },
  style: Record<string, number | string>
) =>
  CORNER_SHAPES.every((name) => resolveCornerShape(style[name]) === 1) &&
  !!resolveBorderRadii(box, style)?.some(([x, y]) => x > 0 && y > 0)

const CORNER_SHAPES = [
  'cornerTopLeftShape',
  'cornerTopRightShape',
  'cornerBottomRightShape',
  'cornerBottomLeftShape',
]

function drawBorder(
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
  style: Record<string, number | string>,
  /** The style of the whole border, which splits the sides at the corners. */
  regionStyle: Record<string, number | string>,
  /** The inset of the outer edge of the line, `[top, right, bottom, left]`. */
  offset = [0, 0, 0, 0]
) {
  const directions = ['borderTop', 'borderRight', 'borderBottom', 'borderLeft']
  const box = { left, top, width, height }

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
  const roundCorners = CORNER_SHAPES.every(
    (name) => resolveCornerShape(style[name]) === 1
  )
  // Rounded dashed borders are drawn clipped to the area of the border.
  const roundedDashes =
    !asContentMask &&
    id !== undefined &&
    isRoundedBox(box, style) &&
    directions.some((d) => style[d + 'Style'] === 'dashed')
  if ((splitCorners || roundedDashes) && roundCorners) {
    const widths = SIDES.map(
      (side) => (style[`border${side}Width`] as number) || 0
    )
    maxWidth = Math.max(...widths)
    const [t, r, b, l] = offset
    const radiusStyle = style as Record<string, number>
    const outer =
      radius(box, radiusStyle, undefined, false, offset) ||
      rectPath(left + l, top + t, width - l - r, height - t - b)
    const innerInset = offset.map((o, i) => o + widths[i])
    const inner =
      radius(box, radiusStyle, undefined, false, innerInset) ||
      rectPath(
        left + innerInset[3],
        top + innerInset[0],
        Math.max(0, width - innerInset[1] - innerInset[3]),
        Math.max(0, height - innerInset[0] - innerInset[2])
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
  const clipToRegion = (sides: boolean[], content: string) => {
    const clipId = `satori_bs-${id}-${group++}`
    return (
      buildXMLString(
        'defs',
        {},
        (group === 1 ? ring : '') +
          buildXMLString(
            'clipPath',
            { id: clipId },
            buildXMLString('polygon', {
              points: sidesRegion(sides, left, top, width, height, regionStyle),
            })
          )
      ) +
      buildXMLString(
        'g',
        { transform: props.transform, 'clip-path': `url(#${clipId})` },
        content
      )
    )
  }
  const drawSides = (sides: boolean[], attributes: Record<string, any>) => {
    if (!splitCorners) return buildXMLString('path', attributes)
    const { transform: _transform, ...rest } = attributes
    // Draw the whole corners, clipped where the sides meet and to the area of
    // the border, so the width changes along the corners.
    rest.d = radius(box, style as Record<string, number>, sides, true, offset)
    if (ringId) rest['stroke-width'] = maxWidth * 2
    return clipToRegion(
      sides,
      ringId
        ? buildXMLString(
            'g',
            { 'clip-path': `url(#${ringId})` },
            buildXMLString('path', rest)
          )
        : buildXMLString('path', rest)
    )
  }

  // Draws a group of adjacent sides with the same style.
  const drawGroup = (sides: boolean[], [lineWidth, lineStyle, color, d]) => {
    const w =
      (lineWidth || 0) +
      (asContentMask && !maskBorderOnly
        ? style[d.replace('border', 'padding')] || 0
        : 0)
    if (!w) return ''
    if (!asContentMask && (lineStyle === 'dotted' || lineStyle === 'dashed')) {
      const { transform, ...attributes } = props
      const clipped =
        lineStyle === 'dashed' && !!ringId && isRoundedBox(box, style)
      const clipToRing = (path: string) =>
        clipped
          ? buildXMLString('g', { 'clip-path': `url(#${ringId})` }, path)
          : path
      // Dashes of rounded borders with the same style on all sides go around
      // the whole border once.
      if (
        lineStyle === 'dashed' &&
        sides.every(Boolean) &&
        isRoundedBox(box, style)
      ) {
        const path = drawPatternedSide(
          0,
          lineStyle,
          box,
          style,
          offset,
          { ...(clipped ? attributes : props), stroke: color },
          clipped
        )
        return clipped
          ? buildXMLString('defs', {}, ring) +
              buildXMLString('g', { transform }, clipToRing(path))
          : path
      }
      let lines = ''
      for (let side = 0; side < 4; side++) {
        if (!sides[side]) continue
        const sideOnly = [false, false, false, false]
        sideOnly[side] = true
        const path = drawPatternedSide(
          side,
          lineStyle,
          box,
          style,
          offset,
          { ...(splitCorners ? attributes : props), stroke: color },
          clipped && splitCorners
        )
        lines += splitCorners
          ? clipToRegion(sideOnly, clipped ? clipToRing(path) : path)
          : path
      }
      return lines
    }
    return drawSides(sides, {
      width,
      height,
      ...props,
      fill: 'none',
      stroke: asContentMask ? '#000' : color,
      'stroke-width': w * 2,
      d: radius(box, style as Record<string, number>, sides, false, offset),
    })
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
      fullBorder += drawGroup(partialSides, currentStyle as any)
      partialSides = [false, false, false, false]
    }
  }

  if (partialSides.some(Boolean)) {
    fullBorder += drawGroup(partialSides, currentStyle as any)
  }

  return fullBorder
}
