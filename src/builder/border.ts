import cssColorParse from 'parse-css-color'
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

function hslToRgb([h, s, l]: number[]) {
  s /= 100
  l /= 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return (
      255 *
      (l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1)))
    )
  }
  return [f(0), f(8), f(4)].map(Math.round)
}

/**
 * The dark and light shades of a color for the sides of `inset`, `outset`,
 * `groove` and `ridge` borders. CSS leaves them to the user agent, these are
 * the ones of Chrome.
 */
function shadeColor(color: string): [dark: string, light: string] {
  const parsed = cssColorParse(color)
  if (!parsed) return [color, color]
  const rgb = parsed.type === 'hsl' ? hslToRgb(parsed.values) : parsed.values
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
    parsed.alpha < 1
      ? `rgba(${r},${g},${b},${parsed.alpha})`
      : `rgb(${r},${g},${b})`
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
 * The gap between dashes of a side, so that it starts and ends with a dash,
 * and the gap is as close to `gap` as possible.
 */
function fitDashGap(length: number, dash: number, gap: number) {
  const fewer = Math.floor((length + gap) / (dash + gap))
  const fewerGap = (length - fewer * dash) / (fewer - 1)
  const moreGap = (length - (fewer + 1) * dash) / fewer
  return moreGap <= 0 || Math.abs(fewerGap - gap) < Math.abs(moreGap - gap)
    ? fewerGap
    : moreGap
}

/**
 * Draws a dotted or dashed side along the middle of the side. Dots are round,
 * or square if they're smaller than 3px, with a dot at each corner. Dashes are
 * twice as long as the width, or three times if it's smaller than 3px, with a
 * dash at each end, so they cover the corners together with the dashes of the
 * next sides.
 */
function drawPatternedSide(
  side: number,
  lineStyle: 'dotted' | 'dashed',
  box: { left: number; top: number; width: number; height: number },
  style: Record<string, number | string>,
  offset: number[],
  attributes: Record<string, any>
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

  // Sides go from corner to corner of the box, including rounded corners, so
  // the dashes at the ends of adjacent sides cover the corners together.
  const [t, r, b, l] = offset
  const left = box.left + l
  const top = box.top + t
  const right = box.left + box.width - r
  const bottom = box.top + box.height - b
  const half = width / 2
  const center = offset.map((o, i) => o + widths[i] / 2)
  const radii = resolveBorderRadii(box, style)?.map(([x, y], i) => [
    Math.max(0, x - center[i % 3 === 0 ? 3 : 1]),
    Math.max(0, y - center[i < 2 ? 0 : 2]),
  ])
  const corners = radii ? [radii[side], radii[(side + 1) % 4]] : []
  const isRounded = corners.some(([x, y]) => x > 0 && y > 0)
  // A quarter of the perimeter of an ellipse, by Ramanujan's approximation.
  const arc = ([x, y]: number[]) =>
    (Math.PI * (3 * (x + y) - Math.sqrt((3 * x + y) * (x + 3 * y)))) / 4
  const straight = side % 2 === 0 ? right - left : bottom - top
  const length = isRounded
    ? (side % 2 === 0 ? box.width : box.height) -
      center[(side + 3) % 4] -
      center[(side + 1) % 4] -
      corners.reduce(
        (sum, [x, y]) => sum + (side % 2 === 0 ? x : y) - arc([x, y]),
        0
      )
    : straight
  const d = isRounded
    ? radius(box, style, sides, true, center)
    : [
        `M${left},${top + half}H${right}`,
        `M${right - half},${top}V${bottom}`,
        `M${right},${bottom - half}H${left}`,
        `M${left + half},${bottom}V${top}`,
      ][side]
  const dash = width * (width >= 3 ? 2 : 3)
  const gap = width * (width >= 3 ? 1 : 2)
  return buildXMLString('path', {
    ...attributes,
    fill: 'none',
    'stroke-width': width,
    // A side without room for two dashes is solid.
    'stroke-dasharray':
      length > dash * 2
        ? `${dash} ${fitDashGap(length, dash, gap)}`
        : undefined,
    d,
  })
}

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
  const roundCorners = [
    'cornerTopLeftShape',
    'cornerTopRightShape',
    'cornerBottomRightShape',
    'cornerBottomLeftShape',
  ].every((name) => resolveCornerShape(style[name]) === 1)
  if (splitCorners && roundCorners) {
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
      let lines = ''
      for (let side = 0; side < 4; side++) {
        if (!sides[side]) continue
        const sideOnly = [false, false, false, false]
        sideOnly[side] = true
        const { transform: _transform, ...attributes } = props
        const path = drawPatternedSide(side, lineStyle, box, style, offset, {
          ...(splitCorners ? attributes : props),
          stroke: color,
        })
        lines += splitCorners ? clipToRegion(sideOnly, path) : path
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
