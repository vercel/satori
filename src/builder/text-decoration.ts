import { buildXMLString } from '../utils.js'

export default function buildDecoration(
  {
    width,
    left,
    top,
    ascender,
    clipPathId,
  }: {
    width: number
    left: number
    top: number
    ascender: number
    clipPathId?: string
  },
  style: Record<string, any>
) {
  const {
    textDecorationColor,
    textDecorationStyle,
    textDecorationLine,
    fontSize,
  } = style
  if (!textDecorationLine || textDecorationLine === 'none') return ''

  // The UA should use such font-based information when choosing auto line thicknesses wherever appropriate.
  // https://drafts.csswg.org/css-text-decor-4/#text-decoration-thickness
  const height = Math.max(1, fontSize * 0.1)

  const y =
    textDecorationLine === 'line-through'
      ? top + ascender * 0.5
      : textDecorationLine === 'underline'
      ? top + ascender * 1.1
      : top

  const dasharray =
    textDecorationStyle === 'dashed'
      ? `${height * 1.2} ${height * 2}`
      : textDecorationStyle === 'dotted'
      ? `0 ${height * 2}`
      : undefined

  return buildXMLString('line', {
    x1: left,
    y1: y,
    x2: left + width,
    y2: y,
    stroke: textDecorationColor,
    'stroke-width': height,
    'stroke-dasharray': dasharray,
    'stroke-linecap': textDecorationStyle === 'dotted' ? 'round' : 'square',
    'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
  })
}
