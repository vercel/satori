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
    textDecorationLine,
    textDecorationSkipInk,
    fontSize,
    color,
  } = style
  if (!textDecorationLine || textDecorationLine === 'none') return ''

  // The UA should use such font-based information when choosing auto line thicknesses wherever appropriate.
  // https://drafts.csswg.org/css-text-decor-4/#text-decoration-thickness
  const height = Math.max(1, fontSize * 0.1)

  const y =
    textDecorationLine === 'line-through'
      ? top + ascender * 0.7
      : textDecorationLine === 'underline'
      ? top + ascender * 1.1
      : top

  const dasharray =
    textDecorationStyle === 'dashed'
      ? `${height * 1.2} ${height * 2}`
      : textDecorationStyle === 'dotted'
      ? `0 ${height * 2}`
      : undefined

  const applySkipInk =
    textDecorationLine === 'underline' &&
    (textDecorationSkipInk || 'auto') !== 'none' &&
    glyphBoxes?.length

  const baseline = top + ascender

  const segments = applySkipInk
    ? buildSkipInkSegments(left, left + width, glyphBoxes, y, height, baseline)
    : ([[left, left + width]] as [number, number][])

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
    (clipPathId ? `<g clip-path="url(#${clipPathId})">` : '') +
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
      .join('') +
    extraLine +
    (clipPathId ? '</g>' : '')
  )
}
