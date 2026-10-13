/**
 * Converts logical properties to physical ones, for the horizontal writing
 * mode of Satori: the inline axis is horizontal, and its start is the left
 * side, or the right side with `direction: rtl`.
 *
 * @see https://www.w3.org/TR/css-logical-1/
 */

import valueParser from 'postcss-value-parser'

type Style = Record<string, string | number>

const BOX_SIDE =
  /^(margin|padding|inset|border)(Inline|Block)(Start|End)?(Width|Style|Color)?$/
const SIZE = /^(?:(min|max)(Inline|Block)|(inline|block))Size$/
const RADIUS = /^border(Start|End)(Start|End)Radius$/

const isLogical = (property: string) =>
  BOX_SIDE.test(property) || SIZE.test(property) || RADIUS.test(property)

/** The values of a declaration, separated by whitespace outside functions. */
function splitValues(value: string | number) {
  if (typeof value === 'number') return [value]
  return valueParser(value)
    .nodes.filter((node) => node.type !== 'space')
    .map((node) => valueParser.stringify(node))
}

/**
 * The style with logical properties replaced by physical ones, in the same
 * position, so that later declarations still override earlier ones.
 */
export function toPhysicalProperties(style: Style, direction: string): Style {
  let hasLogical = false
  for (const property in style) {
    if (isLogical(property)) {
      hasLogical = true
      break
    }
  }
  if (!hasLogical) return style

  const [inlineStart, inlineEnd] =
    direction === 'rtl' ? ['Right', 'Left'] : ['Left', 'Right']
  const sides = (axis: string) =>
    axis === 'Inline' ? [inlineStart, inlineEnd] : ['Top', 'Bottom']

  const result: Style = {}
  const set = (property: string, value: string | number) => {
    delete result[property]
    result[property] = value
  }

  for (const property in style) {
    const value = style[property]
    const box = BOX_SIDE.exec(property)
    const size = SIZE.exec(property)
    const radius = RADIUS.exec(property)
    if (box) {
      const [, kind, axis, edge, part = ''] = box
      const [start, end] = sides(axis)
      const name = (side: string) =>
        kind === 'inset' ? side.toLowerCase() : `${kind}${side}${part}`
      if (edge) {
        set(name(edge === 'Start' ? start : end), value)
      } else if (kind === 'border' && !part) {
        // `border-inline` sets both sides to the same border.
        set(name(start), value)
        set(name(end), value)
      } else {
        // Shorthands have the start value, and the end value if it differs.
        const values = splitValues(value)
        set(name(start), values[0])
        set(name(end), values.length > 1 ? values[1] : values[0])
      }
    } else if (size) {
      const [, limit, axis = size[3]] = size
      const dimension = axis.toLowerCase() === 'inline' ? 'Width' : 'Height'
      set(limit ? `${limit}${dimension}` : dimension.toLowerCase(), value)
    } else if (radius) {
      // The first edge is of the block axis, and the second of the inline axis.
      const [, block, inline] = radius
      set(
        `border${block === 'Start' ? 'Top' : 'Bottom'}${
          inline === 'Start' ? inlineStart : inlineEnd
        }Radius`,
        value
      )
    } else {
      set(property, value)
    }
  }
  return result
}
