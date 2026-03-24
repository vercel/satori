import { parseConicGradient, ColorStop } from 'css-gradient-parser'
import { buildXMLString, lengthToNumber, calcDegree } from '../../utils.js'
import { normalizeStops } from './utils.js'
import cssColorParse from 'parse-css-color'

interface NormalizedStop {
  color: string
  offset?: number
}

const SEGMENT_COUNT = 360

const VALUE_RE =
  /^-?\d+\.?\d*(%|px|em|rem|deg|rad|grad|turn|vw|vh|ch|vmin|vmax)?$/

function splitRespectingParens(s: string, sep: RegExp): string[] {
  const result: string[] = []
  let depth = 0
  let start = 0

  for (let i = 0; i <= s.length; i++) {
    if (i < s.length) {
      if (s[i] === '(') depth++
      else if (s[i] === ')') depth--
    }

    const isSep = i === s.length || (depth === 0 && sep.test(s[i]))
    if (isSep) {
      const part = s.slice(start, i).trim()
      if (part) result.push(part)
      start = i + 1
    }
  }
  return result
}

function expandTwoPositionStops(input: string): string {
  const match = input.match(/^((?:repeating-)?conic-gradient)\((.+)\)$/s)
  if (!match) return input

  const [, prefix, content] = match
  const segments = splitRespectingParens(content, /,/)

  const expanded: string[] = []
  for (const seg of segments) {
    const tokens = splitRespectingParens(seg, /\s+/)

    if (tokens.some((t) => t === 'from' || t === 'at' || t === 'in')) {
      expanded.push(seg)
      continue
    }

    if (
      tokens.length >= 3 &&
      VALUE_RE.test(tokens[tokens.length - 1]) &&
      VALUE_RE.test(tokens[tokens.length - 2])
    ) {
      const color = tokens.slice(0, -2).join(' ')
      expanded.push(`${color} ${tokens[tokens.length - 2]}`)
      expanded.push(`${color} ${tokens[tokens.length - 1]}`)
    } else {
      expanded.push(seg)
    }
  }

  return `${prefix}(${expanded.join(', ')})`
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0,
    g = 0,
    b = 0

  if (h < 60) {
    r = c
    g = x
    b = 0
  } else if (h < 120) {
    r = x
    g = c
    b = 0
  } else if (h < 180) {
    r = 0
    g = c
    b = x
  } else if (h < 240) {
    r = 0
    g = x
    b = c
  } else if (h < 300) {
    r = x
    g = 0
    b = c
  } else {
    r = c
    g = 0
    b = x
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

function parseToRGBA(color: string): [number, number, number, number] | null {
  const parsed = cssColorParse(color)
  if (!parsed) return null

  if (parsed.type === 'hsl') {
    const [h, s, l] = parsed.values
    const [r, g, b] = hslToRgb(h, s, l)
    return [r, g, b, parsed.alpha]
  }

  return [parsed.values[0], parsed.values[1], parsed.values[2], parsed.alpha]
}

function formatRGBA(c: [number, number, number, number]): string {
  if (c[3] === 1) return `rgb(${c[0]},${c[1]},${c[2]})`
  return `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`
}

function interpolateColor(t: number, stops: NormalizedStop[]): string {
  if (stops.length === 0) return 'transparent'
  if (stops.length === 1) {
    const c = parseToRGBA(stops[0].color)
    return c ? formatRGBA(c) : stops[0].color
  }

  let i = 0
  if (t <= stops[0].offset) i = 0
  else if (t >= stops[stops.length - 1].offset) i = stops.length - 2
  else {
    while (i < stops.length - 1 && stops[i + 1].offset <= t) i++
  }

  if (i >= stops.length - 1) i = stops.length - 2

  const s1 = stops[i]
  const s2 = stops[i + 1]
  const c1 = parseToRGBA(s1.color)
  const c2 = parseToRGBA(s2.color)
  if (!c1 || !c2) return s1.color

  if (s1.offset === s2.offset) return formatRGBA(c2)

  const localT = Math.max(
    0,
    Math.min(1, (t - s1.offset) / (s2.offset - s1.offset))
  )

  const r = Math.round(c1[0] + (c2[0] - c1[0]) * localT)
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * localT)
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * localT)
  const a = c1[3] + (c2[3] - c1[3]) * localT

  if (a === 1) return `rgb(${r},${g},${b})`
  return `rgba(${r},${g},${b},${a})`
}

function resolvePositionPart(
  v: string,
  dim: number,
  fontSize: number,
  style: Record<string, string | number>
): number {
  switch (v) {
    case 'left':
    case 'top':
      return 0
    case 'center':
      return dim / 2
    case 'right':
    case 'bottom':
      return dim
    default:
      return lengthToNumber(v, fontSize, dim, style, true) ?? dim / 2
  }
}

function resolvePosition(
  position: string,
  xDelta: number,
  yDelta: number,
  fontSize: number,
  style: Record<string, string | number>
): { cx: number; cy: number } {
  if (!position || position === 'center')
    return { cx: xDelta / 2, cy: yDelta / 2 }

  const parts = position.trim().split(/\s+/)

  if (parts.length === 1) {
    const p = parts[0]
    if (p === 'top' || p === 'bottom')
      return {
        cx: xDelta / 2,
        cy: resolvePositionPart(p, yDelta, fontSize, style),
      }
    return {
      cx: resolvePositionPart(p, xDelta, fontSize, style),
      cy: yDelta / 2,
    }
  }

  return {
    cx: resolvePositionPart(parts[0], xDelta, fontSize, style),
    cy: resolvePositionPart(parts[1], yDelta, fontSize, style),
  }
}

function calcTotalLength(stops: ColorStop[], repeating: boolean): number {
  if (!repeating) return 360
  const lastStop = stops.at(-1)
  if (!lastStop?.offset) return 360
  if (lastStop.offset.unit === '%') return 360
  const deg = calcDegree(`${lastStop.offset.value}${lastStop.offset.unit}`)
  return deg || 360
}

export function buildConicGradient(
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
  const parsed = parseConicGradient(expandTwoPositionStops(image))
  const [xDelta, yDelta] = dimensions
  const fontSize = inheritableStyle.fontSize as number

  const startAngle = calcDegree(parsed.angle) || 0

  const { cx, cy } = resolvePosition(
    parsed.position,
    xDelta,
    yDelta,
    fontSize,
    inheritableStyle as Record<string, string | number>
  )

  const totalLength = calcTotalLength(parsed.stops, parsed.repeating)

  const stops = normalizeStops(
    totalLength,
    parsed.stops,
    inheritableStyle as Record<string, string | number>,
    parsed.repeating,
    from
  )

  const radius = Math.max(
    Math.sqrt(cx * cx + cy * cy),
    Math.sqrt((xDelta - cx) ** 2 + cy ** 2),
    Math.sqrt((xDelta - cx) ** 2 + (yDelta - cy) ** 2),
    Math.sqrt(cx ** 2 + (yDelta - cy) ** 2)
  )

  const patternId = `satori_conic_pattern_${id}`
  const clipId = `satori_conic_clip_${id}`

  const slices: string[] = []

  const flushSlice = (startIdx: number, endIdx: number, color: string) => {
    const a1 = startAngle + (startIdx / SEGMENT_COUNT) * 360
    const a2 = startAngle + (endIdx / SEGMENT_COUNT) * 360

    if (endIdx - startIdx >= SEGMENT_COUNT) {
      slices.push(
        buildXMLString('circle', {
          cx,
          cy,
          r: radius,
          fill: color,
        })
      )
      return
    }

    const r1 = ((a1 - 90) * Math.PI) / 180
    const r2 = ((a2 - 90) * Math.PI) / 180
    const x1 = cx + radius * Math.cos(r1)
    const y1 = cy + radius * Math.sin(r1)
    const x2 = cx + radius * Math.cos(r2)
    const y2 = cy + radius * Math.sin(r2)
    const largeArc = a2 - a1 > 180 ? 1 : 0
    const d = `M${cx},${cy}L${x1},${y1}A${radius},${radius},0,${largeArc},1,${x2},${y2}Z`

    slices.push(buildXMLString('path', { d, fill: color }))
  }

  let prevColor: string | null = null
  let mergeStart = 0
  const cycleDeg = parsed.repeating ? totalLength : 360

  for (let i = 0; i < SEGMENT_COUNT; i++) {
    const angleDeg = (i / SEGMENT_COUNT) * 360
    const t = cycleDeg > 0 ? (angleDeg % cycleDeg) / cycleDeg : 0
    const color = interpolateColor(t, stops)

    if (color !== prevColor) {
      if (prevColor !== null) {
        flushSlice(mergeStart, i, prevColor)
      }
      mergeStart = i
      prevColor = color
    }
  }

  if (prevColor !== null) {
    flushSlice(mergeStart, SEGMENT_COUNT, prevColor)
  }

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
      'clipPath',
      { id: clipId },
      buildXMLString('rect', {
        x: 0,
        y: 0,
        width: xDelta,
        height: yDelta,
      })
    ) + buildXMLString('g', { 'clip-path': `url(#${clipId})` }, slices.join(''))
  )

  return [patternId, defs]
}
