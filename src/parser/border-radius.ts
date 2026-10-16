/**
 * Parses the `border-radius` shorthand into the radii of the corners, with
 * math functions, which css-to-react-native doesn't support.
 * https://drafts.csswg.org/css-backgrounds-3/#border-radius
 */

import valueParser from 'postcss-value-parser'
import { MATH_FUNCTION } from './math.js'

const RADIUS = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:[a-z]+|%)?$/i

const CORNERS = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
] as const

/** The components of a value, split at whitespace outside of functions. */
export function splitRadius(value: string): string[] {
  return valueParser(value)
    .nodes.filter((node) => node.type !== 'space' && node.type !== 'comment')
    .map((node) => valueParser.stringify(node))
}

/** Whether a component is a non-negative length or percentage. */
export function isRadius(component: string) {
  return RADIUS.test(component) || MATH_FUNCTION.test(component)
}

/**
 * The radii of the corners, from the top left one. A corner with different
 * horizontal and vertical radii has both, separated by a space.
 */
export function expandBorderRadius(value: string) {
  const invalid = () =>
    new Error(`Invalid value for CSS property "borderRadius": "${value}".`)
  // The vertical radii come after a slash.
  const parts: string[][] = [[]]
  for (const node of valueParser(value).nodes) {
    if (node.type === 'div' && node.value === '/') parts.push([])
    else if (node.type === 'div') throw invalid()
    else if (node.type !== 'space' && node.type !== 'comment') {
      parts[parts.length - 1].push(valueParser.stringify(node))
    }
  }
  if (
    parts.length > 2 ||
    parts.some((radii) => !radii.length || radii.length > 4) ||
    !parts.flat().every(isRadius)
  ) {
    throw invalid()
  }
  const corners = (radii: string[]) => [
    radii[0],
    radii[1] ?? radii[0],
    radii[2] ?? radii[0],
    radii[3] ?? radii[1] ?? radii[0],
  ]
  const horizontal = corners(parts[0])
  const vertical = parts[1] ? corners(parts[1]) : undefined
  const result: Record<string, string> = {}
  CORNERS.forEach((corner, i) => {
    result[corner] = vertical
      ? `${horizontal[i]} ${vertical[i]}`
      : horizontal[i]
  })
  return result
}
