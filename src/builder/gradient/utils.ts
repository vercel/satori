import { lengthToNumber } from '../../utils.js'
import {
  convertColors,
  isColor,
  mixColors,
  parseColor,
  parseCSSColor,
  parseInterpolationMethod,
  serializeColor,
  toRGBA,
  type InterpolationMethod,
  type RGBA,
} from '../../parser/color.js'
import type { ColorStop } from 'css-gradient-parser'
import valueParser from 'postcss-value-parser'

const POSITION =
  /^[+-]?(\d+\.?\d*|\.\d+)(px|em|rem|vw|vh|%|deg|turn|rad|grad)?$/i

/**
 * Expands color stops with two positions, e.g. `red 0 50%`, into two stops
 * with the color, which is how they're defined and the only form
 * `css-gradient-parser` supports.
 */
export function expandColorStops(gradient: string) {
  const [fn] = valueParser(gradient).nodes
  if (fn?.type !== 'function') return gradient

  const args: string[][] = [[]]
  for (const node of fn.nodes) {
    if (node.type === 'div' && node.value === ',') args.push([])
    else if (node.type !== 'space' && node.type !== 'comment') {
      args[args.length - 1].push(valueParser.stringify(node))
    }
  }
  let changed = false
  const expanded = args.map((tokens) => {
    const [color, start, end] = tokens
    if (
      tokens.length === 3 &&
      isColor(color) &&
      POSITION.test(start) &&
      POSITION.test(end)
    ) {
      changed = true
      return `${color} ${start}, ${color} ${end}`
    }
    return tokens.join(' ')
  })
  return changed ? `${fn.value}(${expanded.join(', ')})` : gradient
}

/**
 * Removes the color interpolation method of a gradient, `in <space> [<hue>
 * hue]` in its first argument, which `css-gradient-parser` doesn't support.
 */
export function extractInterpolationMethod(
  gradient: string
): [gradient: string, method: InterpolationMethod | undefined] {
  if (!/\bin\b/i.test(gradient)) return [gradient, undefined]
  const [fn] = valueParser(gradient).nodes
  if (fn?.type !== 'function') return [gradient, undefined]
  const comma = fn.nodes.findIndex(
    (node) => node.type === 'div' && node.value === ','
  )
  if (comma === -1) return [gradient, undefined]
  const first = fn.nodes
    .slice(0, comma)
    .filter((node) => node.type !== 'space' && node.type !== 'comment')
    .map((node) => valueParser.stringify(node))
  const index = first.findIndex((token) => token.toLowerCase() === 'in')
  if (index === -1) return [gradient, undefined]
  let length = 4
  let method = parseInterpolationMethod(first.slice(index, index + length))
  if (!method) {
    length = 2
    method = parseInterpolationMethod(first.slice(index, index + length))
  }
  if (!method) return [gradient, undefined]
  first.splice(index, length)
  const stops = valueParser.stringify(fn.nodes.slice(comma + 1)).trim()
  return [
    `${fn.value}(${first.length ? first.join(' ') + ', ' : ''}${stops})`,
    method,
  ]
}

/** Moves the middle of the transition between two colors to a hint. */
export function applyHint(t: number, hint: number) {
  if (hint <= 0) return 1
  if (hint >= 1) return 0
  return Math.pow(t, Math.log(0.5) / Math.log(hint))
}

/**
 * Adds stops between `t0` and `t1` until SVG's interpolation in sRGB without
 * premultiplied alpha is within a level of each channel.
 */
function subdivide(
  colorAt: (t: number) => RGBA,
  t0: number,
  c0: RGBA,
  t1: number,
  c1: RGBA,
  add: (t: number, color: RGBA) => void,
  depth = 0
) {
  const t = (t0 + t1) / 2
  const color = colorAt(t)
  const premultiplied = (c: number[]) => [
    c[0] * c[3],
    c[1] * c[3],
    c[2] * c[3],
    c[3] * 255,
  ]
  const expected = premultiplied(color)
  const drawn = premultiplied(c0.map((c, i) => (c + c1[i]) / 2))
  const error = Math.max(...expected.map((c, i) => Math.abs(c - drawn[i])))
  if (error <= 1 || depth >= 6) return
  subdivide(colorAt, t0, c0, t, color, add, depth + 1)
  add(t, color)
  subdivide(colorAt, t, color, t1, c1, add, depth + 1)
}

/**
 * SVG interpolates gradients in sRGB without premultiplied alpha. Transitions
 * in other color spaces, with hints, or between colors with different alpha
 * are approximated with stops in between. Colors that SVG renderers may not
 * support are converted.
 */
function interpolateStops(
  stops: Stop[],
  method: InterpolationMethod | undefined,
  currentColor: string
): Stop[] {
  const result: Stop[] = []
  stops.forEach((a, i) => {
    result.push({
      offset: a.offset,
      color: convertColors(a.color, currentColor),
    })
    const b = stops[i + 1]
    if (!b) return
    const length = b.offset - a.offset
    if (!(length > 0)) return
    const from = parseCSSColor(a.color, currentColor)
    const to = parseCSSColor(b.color, currentColor)
    if (!from || !to) return
    const hint =
      a.hint === undefined
        ? undefined
        : (Math.min(Math.max(a.hint, a.offset), b.offset) - a.offset) / length
    const [rgbaA, rgbaB] = [from, to].map(toRGBA)
    const same =
      JSON.stringify(from) === JSON.stringify(to) ||
      (!method && rgbaA.every((c, j) => c === rgbaB[j]))
    if (same || (!method && hint === undefined && rgbaA[3] === rgbaB[3])) {
      return
    }
    const colorAt = (t: number) =>
      mixColors(from, to, hint === undefined ? t : applyHint(t, hint), method)
    const add = (t: number, color: RGBA) =>
      result.push({
        offset: a.offset + length * t,
        color: serializeColor(color),
      })
    // Starts from quarters, so curves with the same middle are subdivided.
    let previous = rgbaA
    for (let quarter = 1; quarter <= 4; quarter++) {
      const t = quarter / 4
      const color = quarter === 4 ? rgbaB : colorAt(t)
      subdivide(colorAt, t - 0.25, previous, t, color, add)
      if (quarter < 4) add(t, color)
      previous = color
    }
  })
  return result
}

interface Stop {
  color: string
  offset?: number
  /** The position of the interpolation hint after the stop. */
  hint?: number
}

export function normalizeStops(
  totalLength: number,
  colorStops: ColorStop[],
  inheritedStyle: Record<string, string | number>,
  repeating: boolean,
  from?: 'background' | 'mask',
  method?: InterpolationMethod
) {
  // Resolve the color stops based on the spec:
  // https://drafts.csswg.org/css-images/#color-stop-syntax
  const stops: Stop[] = []
  const lastColorStop = colorStops.at(-1)
  const totalPercentage =
    lastColorStop &&
    lastColorStop.offset &&
    lastColorStop.offset.unit === '%' &&
    repeating
      ? +lastColorStop.offset.value
      : 100
  // All offsets are relative values (0-1) in SVG.
  const resolve = (position: ColorStop['offset']) =>
    position.unit === '%'
      ? +position.value / totalPercentage
      : Number(
          lengthToNumber(
            `${position.value}${position.unit}`,
            inheritedStyle.fontSize as number,
            totalLength,
            inheritedStyle,
            true
          )
        ) / totalLength
  for (const stop of colorStops) {
    const { color } = stop
    const hint = stop.hint ? resolve(stop.hint) : undefined
    if (!stops.length) {
      // First stop, ensure it's at the start.
      stops.push({
        offset: 0,
        color,
        hint,
      })

      if (!stop.offset) continue
      if (stop.offset.value === '0') continue
    }

    stops.push({
      offset: stop.offset ? resolve(stop.offset) : undefined,
      color,
      hint,
    })
  }
  if (!stops.length) {
    stops.push({
      offset: 0,
      color: 'transparent',
    })
  }
  // Last stop, ensure it's at the end.
  const lastStop = stops[stops.length - 1]
  if (lastStop.offset !== 1) {
    if (typeof lastStop.offset === 'undefined') {
      lastStop.offset = 1
    } else if (repeating) {
      stops[stops.length - 1] = {
        offset: 1,
        color: lastStop.color,
      }
    } else {
      stops.push({
        offset: 1,
        color: lastStop.color,
      })
    }
  }

  let previousStop = 0
  let nextStop = 1
  // Evenly distribute the missing stop offsets.
  for (let i = 0; i < stops.length; i++) {
    if (typeof stops[i].offset === 'undefined') {
      // Find the next stop that has an offset.
      if (nextStop < i) nextStop = i
      while (typeof stops[nextStop].offset === 'undefined') nextStop++

      stops[i].offset =
        ((stops[nextStop].offset - stops[previousStop].offset) /
          (nextStop - previousStop)) *
          (i - previousStop) +
        stops[previousStop].offset
    } else {
      previousStop = i
    }
  }

  const interpolated = interpolateStops(
    stops,
    method,
    String(inheritedStyle.color)
  )

  if (from === 'mask') {
    return interpolated.map((stop) => {
      const color = parseColor(stop.color)
      if (!color) return stop
      return { ...stop, color: `rgba(255, 255, 255, ${color[3]})` }
    })
  }

  return interpolated
}
