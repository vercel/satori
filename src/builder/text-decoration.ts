import { buildXMLString } from '../utils.js'
import type { GlyphBox } from '../font.js'

function buildSkipInkSegments(
  start: number,
  end: number,
  glyphBoxes: GlyphBox[],
  y: number,
  strokeWidth: number,
  baseline: number
) {
  const halfStroke = strokeWidth / 2
  const bleed = Math.max(halfStroke, strokeWidth * 1.25)
  const skipRanges: [number, number][] = []

  for (const box of glyphBoxes) {
    // Only skip glyphs that actually cross the underline position and extend below the baseline.
    if (box.y2 < baseline + halfStroke || box.y1 > y + halfStroke) continue

    const from = Math.max(start, box.x1 - bleed)
    const to = Math.min(end, box.x2 + bleed)

    if (from >= to) continue
    if (skipRanges.length === 0) {
      skipRanges.push([from, to])
      continue
    }

    const last = skipRanges[skipRanges.length - 1]
    if (from <= last[1]) {
      last[1] = Math.max(last[1], to)
    } else {
      skipRanges.push([from, to])
    }
  }

  if (!skipRanges.length) {
    return [[start, end]] as [number, number][]
  }

  const segments: [number, number][] = []
  let cursor = start

  for (const [from, to] of skipRanges) {
    if (from > cursor) {
      segments.push([cursor, from])
    }
    cursor = Math.max(cursor, to)
    if (cursor >= end) break
  }

  if (cursor < end) {
    segments.push([cursor, end])
  }

  return segments
}

/** The lines of `text-decoration-line`. */
export function getDecorationLines(style: Record<string, any>): string[] {
  const line = style.textDecorationLine
  return !line || line === 'none' ? [] : String(line).split(' ')
}

/** Resolves a percentage of the font size or a length. */
function resolveDecorationLength(value: unknown, fontSize: number) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.endsWith('%')) {
    return (parseFloat(value) / 100) * fontSize
  }
}

/** The thickness of decoration lines. */
export function getDecorationThickness(style: Record<string, any>) {
  const thickness = resolveDecorationLength(
    style.textDecorationThickness,
    style.fontSize
  )
  // The UA should use such font-based information when choosing auto line thicknesses wherever appropriate.
  // https://drafts.csswg.org/css-text-decor-4/#text-decoration-thickness
  return thickness === undefined
    ? Math.max(1, style.fontSize * 0.1)
    : Math.max(0, thickness)
}

/**
 * The distance of the underline's center from the top of the text. A
 * `text-underline-offset` is the distance of its top edge from the baseline.
 */
export function getUnderlineY(
  style: Record<string, any>,
  ascender: number,
  thickness: number
) {
  const offset = resolveDecorationLength(
    style.textUnderlineOffset,
    style.fontSize
  )
  return offset === undefined
    ? ascender * 1.1
    : ascender + offset + thickness / 2
}

/** A wavy line along a segment, starting and ending at its center. */
function wavyPath(x1: number, x2: number, y: number, thickness: number) {
  const amplitude = Math.max(1, thickness)
  const period = Math.max(4, thickness * 4)
  let d = `M${x1} ${y}`
  for (let x = x1; x < x2; x += period / 2) {
    const half = Math.min(period / 2, x2 - x)
    const direction = Math.round((x - x1) / (period / 2)) % 2 ? 1 : -1
    d += ` q${half / 2} ${direction * amplitude * 2} ${half} 0`
  }
  return d
}

export default function buildDecoration(
  {
    width,
    left,
    top,
    ascender,
    clipPathId,
    matrix,
    glyphBoxes,
  }: {
    width: number
    left: number
    top: number
    ascender: number
    clipPathId?: string
    matrix?: string
    glyphBoxes?: GlyphBox[]
  },
  style: Record<string, any>
) {
  const {
    textDecorationColor,
    textDecorationStyle,
    textDecorationSkipInk,
    color,
  } = style
  const height = getDecorationThickness(style)
  if (!height) return ''

  const content = getDecorationLines(style)
    .map((line) =>
      buildLine(
        line,
        line === 'line-through'
          ? top + ascender * 0.7
          : line === 'underline'
          ? top + getUnderlineY(style, ascender, height)
          : // Like in browsers, the overline is drawn above the text.
            top - height / 2
      )
    )
    .join('')

  return clipPathId && content
    ? buildXMLString('g', { 'clip-path': `url(#${clipPathId})` }, content)
    : content

  function buildLine(line: string, y: number) {
    const dasharray =
      textDecorationStyle === 'dashed'
        ? `${height * 1.2} ${height * 2}`
        : textDecorationStyle === 'dotted'
        ? `0 ${height * 2}`
        : undefined

    const applySkipInk =
      line === 'underline' &&
      (textDecorationSkipInk || 'auto') !== 'none' &&
      glyphBoxes?.length

    const baseline = top + ascender

    const segments = applySkipInk
      ? buildSkipInkSegments(
          left,
          left + width,
          glyphBoxes,
          y,
          height,
          baseline
        )
      : ([[left, left + width]] as [number, number][])

    if (textDecorationStyle === 'wavy') {
      return segments
        .map(([x1, x2]) =>
          buildXMLString('path', {
            d: wavyPath(x1, x2, y, height),
            fill: 'none',
            stroke: textDecorationColor || color,
            'stroke-width': height,
            transform: matrix,
          })
        )
        .join('')
    }

    // https://www.w3.org/TR/css-backgrounds-3/#valdef-line-style-double
    const extraLine =
      textDecorationStyle === 'double'
        ? segments
            .map(([x1, x2]) =>
              buildXMLString('line', {
                x1,
                y1: y + height + 1,
                x2,
                y2: y + height + 1,
                stroke: textDecorationColor || color,
                'stroke-width': height,
                'stroke-dasharray': dasharray,
                'stroke-linecap':
                  textDecorationStyle === 'dotted' ? 'round' : 'square',
                transform: matrix,
              })
            )
            .join('')
        : ''

    return (
      segments
        .map(([x1, x2]) =>
          buildXMLString('line', {
            x1,
            y1: y,
            x2,
            y2: y,
            stroke: textDecorationColor || color,
            'stroke-width': height,
            'stroke-dasharray': dasharray,
            'stroke-linecap':
              textDecorationStyle === 'dotted' ? 'round' : 'square',
            transform: matrix,
          })
        )
        .join('') + extraLine
    )
  }
}
