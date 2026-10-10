import { parseConicGradient } from 'css-gradient-parser'
import {
  parseColor as parseRGBA,
  mixColors,
  parseCSSColor,
  type Color,
  type InterpolationMethod,
} from '../../parser/color.js'

import { buildXMLString, calcDegree, lengthToNumber } from '../../utils.js'
import {
  applyHint,
  expandColorStops,
  extractInterpolationMethod,
} from './utils.js'

/**
 * SVG has no conic gradients, so they're drawn as thin wedges around the
 * center, each filled with the color in its middle.
 * https://drafts.csswg.org/css-images-4/#conic-gradients
 */
export function buildConicGradient(
  {
    id,
    width,
    height,
    tiles,
  }: {
    id: string
    width: number
    height: number
    /** The distance between repeated images. */
    tiles: [number, number]
  },
  image: string,
  dimensions: number[],
  offsets: number[],
  inheritableStyle: Record<string, number | string>,
  from?: 'background' | 'mask'
) {
  const {
    angle,
    position,
    stops: colorStops,
    repeating,
  } = parseConicGradient(expandColorStops(extractInterpolationMethod(image)[0]))
  const method = extractInterpolationMethod(image)[1]
  const [w, h] = dimensions
  const [cx, cy] = resolveCenter(position, w, h, inheritableStyle)
  const startAngle = calcDegree(angle) || 0

  const stops = resolveStops(colorStops, inheritableStyle)
  const colorAt = createColorAt(stops, repeating, method)

  // Split at every stop, then into wedges of at most 1 degree, with at most
  // about 2 levels of difference in each channel.
  const breaks = new Set<number>([0, 1])
  for (const turn of stopPositions(stops, repeating)) {
    if (turn > 0 && turn < 1) breaks.add(turn)
  }
  const sortedBreaks = [...breaks].sort((a, b) => a - b)
  const segments: [number, number][] = []
  for (let i = 0; i < sortedBreaks.length - 1; i++) {
    const start = sortedBreaks[i]
    const end = sortedBreaks[i + 1]
    if (end - start < 1e-9) continue
    const a = colorAt(start + 1e-9)
    const b = colorAt(end - 1e-9)
    const difference = Math.max(
      ...[0, 1, 2].map((c) => Math.abs(a[c] * a[3] - b[c] * b[3]) * 255),
      Math.abs(a[3] - b[3]) * 255
    )
    const count = Math.min(
      256,
      Math.max(1, Math.ceil((end - start) * 360), Math.ceil(difference / 2))
    )
    for (let j = 0; j < count; j++) {
      segments.push([
        start + ((end - start) * j) / count,
        start + ((end - start) * (j + 1)) / count,
      ])
    }
  }

  // Far enough to cover the box with straight edges between arc points.
  const radius =
    (Math.max(
      Math.hypot(cx, cy),
      Math.hypot(w - cx, cy),
      Math.hypot(cx, h - cy),
      Math.hypot(w - cx, h - cy)
    ) +
      1) /
    Math.cos(Math.PI / 12)
  const point = (turn: number) => {
    const radians = ((startAngle + turn * 360) * Math.PI) / 180
    return `${round(cx + radius * Math.sin(radians))} ${round(
      cy - radius * Math.cos(radians)
    )}`
  }
  const wedge = (start: number, end: number) => {
    let d = `M${round(cx)} ${round(cy)}L${point(start)}`
    // Points at most 30 degrees apart.
    const steps = Math.ceil((end - start) * 12)
    for (let i = 1; i <= steps; i++) {
      d += `L${point(start + ((end - start) * i) / steps)}`
    }
    return d + 'Z'
  }

  // Wedges are drawn without antialiasing, which would show their edges, e.g.
  // as seams. Each one overlaps the next one, which is drawn over it, and the
  // first one starts before the start, under the last one. Where the color
  // changes abruptly, an antialiased wedge is drawn over the edge.
  const overlap = 0.5 / 360
  const difference = (
    a: [number, number, number, number],
    b: [number, number, number, number]
  ) =>
    Math.max(
      ...[0, 1, 2].map((c) => Math.abs(a[c] - b[c])),
      Math.abs(a[3] - b[3])
    ) * 255
  // The color under the center, which may not be in any wedge.
  const base = colorAt(segments[0] ? segments[0][0] : 0)
  let colors = buildXMLString('rect', {
    width: w,
    height: h,
    fill: from === 'mask' ? gray(base[3]) : hex(base),
  })
  let alphas = buildXMLString('rect', {
    width: w,
    height: h,
    fill: gray(base[3]),
  })
  let antialiasedColors = ''
  let antialiasedAlphas = ''
  let translucent = base[3] < 1
  const draw = (
    start: number,
    end: number,
    color: [number, number, number, number],
    antialias: boolean
  ) => {
    if (color[3] < 1) translucent = true
    const d = wedge(start, end)
    // Masks use the luminance, which is the alpha of the gradient.
    const fill = from === 'mask' ? gray(color[3]) : hex(color)
    const shape = buildXMLString('path', { d, fill })
    const alpha = buildXMLString('path', { d, fill: gray(color[3]) })
    if (antialias) {
      antialiasedColors += shape
      antialiasedAlphas += alpha
    } else {
      colors += shape
      alphas += alpha
    }
  }
  segments.forEach(([start, end], index) => {
    draw(
      index === 0 ? start - overlap : start,
      index === segments.length - 1 ? end : end + overlap,
      colorAt((start + end) / 2),
      false
    )
  })
  segments.forEach(([start, end], index) => {
    const before = colorAt(index ? start - 1e-9 : 1 - 1e-9)
    const after = colorAt(start + 1e-9)
    if (difference(before, after) > 2) {
      draw(start, Math.min(end, start + 2 / 360), after, true)
    }
  })
  colors =
    buildXMLString('g', { 'shape-rendering': 'crispEdges' }, colors) +
    antialiasedColors
  alphas =
    buildXMLString('g', { 'shape-rendering': 'crispEdges' }, alphas) +
    antialiasedAlphas

  const patternId = `satori_pattern_${id}`
  const maskId = `satori_mask_${id}`
  const content =
    translucent && from !== 'mask'
      ? buildXMLString(
          'mask',
          {
            id: maskId,
            maskUnits: 'userSpaceOnUse',
            x: 0,
            y: 0,
            width: w,
            height: h,
          },
          alphas
        ) + buildXMLString('g', { mask: `url(#${maskId})` }, colors)
      : colors

  const defs = buildXMLString(
    'pattern',
    {
      id: patternId,
      x: offsets[0] / width,
      y: offsets[1] / height,
      width: tiles[0] / width,
      height: tiles[1] / height,
      patternUnits: 'objectBoundingBox',
    },
    buildXMLString(
      'svg',
      { width: w, height: h, viewBox: `0 0 ${w} ${h}`, overflow: 'hidden' },
      content
    )
  )

  return [patternId, defs]
}

type Stop = {
  color: [number, number, number, number]
  /** The color before it's clipped to sRGB. */
  parsed: Color | null
  position?: number
  hint?: number
}

type ResolvedStop = Stop & { position: number }

const round = (value: number) => Math.round(value * 10) / 10
const hex = ([r, g, b]: number[]) =>
  '#' +
  [r, g, b]
    .map((c) =>
      Math.round(Math.min(1, Math.max(0, c)) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
const gray = (value: number) => hex([value, value, value])

function resolveCenter(
  position: string,
  width: number,
  height: number,
  style: Record<string, number | string>
): [number, number] {
  const tokens = position.trim().split(/\s+/)
  let x: number | undefined
  let y: number | undefined
  const keywords: Record<string, ['x' | 'y' | 'both', number]> = {
    left: ['x', 0],
    right: ['x', 1],
    top: ['y', 0],
    bottom: ['y', 1],
    center: ['both', 0.5],
  }
  const resolve = (token: string, base: number) =>
    lengthToNumber(token, style.fontSize as number, base, style, true)

  // `<x> <y>`, or keywords in any order.
  const lengths: string[] = []
  for (const token of tokens) {
    const keyword = keywords[token]
    if (keyword) {
      if (keyword[0] === 'x') x = keyword[1] * width
      else if (keyword[0] === 'y') y = keyword[1] * height
    } else {
      lengths.push(token)
    }
  }
  if (lengths.length && tokens.length <= 2) {
    if (tokens.length === 1 || !keywords[tokens[0]]) {
      x = resolve(lengths[0], width) ?? x
      if (lengths[1]) y = resolve(lengths[1], height) ?? y
    } else if (keywords[tokens[0]][0] === 'y') {
      x = resolve(lengths[0], width) ?? x
    } else {
      y = resolve(lengths[0], height) ?? y
    }
  }
  return [x ?? width / 2, y ?? height / 2]
}

function parseColor(
  color: string,
  style: Record<string, number | string>
): [number, number, number, number] {
  const value =
    color.toLowerCase() === 'currentcolor' ? String(style.color) : color
  const parsed = parseRGBA(value, String(style.color))
  if (!parsed) return [0, 0, 0, 0]
  const [r, g, b, a] = parsed
  return [r / 255, g / 255, b / 255, a]
}

/** A position as a fraction of a turn. */
function resolvePosition(offset: { value: string; unit: string }) {
  const value = parseFloat(offset.value)
  switch (offset.unit) {
    case '%':
      return value / 100
    case 'deg':
      return value / 360
    case 'grad':
      return value / 400
    case 'rad':
      return value / (2 * Math.PI)
    case 'turn':
      return value
  }
  // Unitless zero.
  return value === 0 ? 0 : undefined
}

// https://drafts.csswg.org/css-images-4/#color-stop-fixup
function resolveStops(
  colorStops: ReturnType<typeof parseConicGradient>['stops'],
  style: Record<string, number | string>
): ResolvedStop[] {
  const stops: Stop[] = colorStops.map((stop) => ({
    color: parseColor(stop.color, style),
    parsed: parseCSSColor(stop.color, String(style.color)),
    position: stop.offset ? resolvePosition(stop.offset) : undefined,
    hint: stop.hint ? resolvePosition(stop.hint) : undefined,
  }))
  if (!stops.length) {
    return [{ color: [0, 0, 0, 0], parsed: null, position: 0 }]
  }
  if (stops[0].position === undefined) stops[0].position = 0
  if (stops[stops.length - 1].position === undefined) {
    stops[stops.length - 1].position = Math.max(
      1,
      ...stops.map((stop) => stop.position ?? 0)
    )
  }
  // A position can't be before the ones before it.
  let max = -Infinity
  for (const stop of stops) {
    if (stop.position !== undefined) {
      stop.position = Math.max(stop.position, max)
      max = stop.position
    }
  }
  // Positions in between are spread evenly.
  for (let i = 0; i < stops.length; i++) {
    if (stops[i].position !== undefined) continue
    let next = i
    while (stops[next].position === undefined) next++
    const start = stops[i - 1].position
    const end = stops[next].position
    for (let j = i; j < next; j++) {
      stops[j].position = start + ((end - start) * (j - i + 1)) / (next - i + 1)
    }
  }
  return stops as ResolvedStop[]
}

/** The positions of all stops in [0, 1], repeated if needed. */
function stopPositions(stops: ResolvedStop[], repeating: boolean) {
  const first = stops[0].position
  const period = stops[stops.length - 1].position - first
  const positions = stops.flatMap((stop) =>
    stop.hint !== undefined ? [stop.position, stop.hint] : [stop.position]
  )
  if (!repeating || period <= 0) return positions
  const all: number[] = []
  const startRepeat = Math.floor((0 - first) / period)
  const endRepeat = Math.ceil((1 - first) / period)
  for (let k = startRepeat; k <= endRepeat; k++) {
    for (const position of positions) all.push(position + k * period)
  }
  return all
}

function createColorAt(
  stops: ResolvedStop[],
  repeating: boolean,
  method: InterpolationMethod | undefined
) {
  const first = stops[0].position
  const last = stops[stops.length - 1].position
  const period = last - first
  return (turn: number): [number, number, number, number] => {
    let p = turn
    if (repeating && period > 0) {
      p = first + ((((p - first) % period) + period) % period)
    }
    if (p <= first) return stops[0].color
    if (p >= last) return stops[stops.length - 1].color
    let i = 0
    while (i < stops.length - 2 && p >= stops[i + 1].position) i++
    const a = stops[i]
    const b = stops[i + 1]
    const length = b.position - a.position
    if (length <= 0) return b.color
    let t = (p - a.position) / length
    // A hint moves the middle of the transition.
    if (a.hint !== undefined) t = applyHint(t, (a.hint - a.position) / length)
    if (method && a.parsed && b.parsed) {
      const [r, g, blue, alpha] = mixColors(a.parsed, b.parsed, t, method)
      return [r / 255, g / 255, blue / 255, alpha]
    }
    // Interpolate with premultiplied alpha.
    const alpha = a.color[3] + (b.color[3] - a.color[3]) * t
    if (alpha === 0) return [0, 0, 0, 0]
    const channel = (c: number) =>
      (a.color[c] * a.color[3] +
        (b.color[c] * b.color[3] - a.color[c] * a.color[3]) * t) /
      alpha
    return [channel(0), channel(1), channel(2), alpha]
  }
}
