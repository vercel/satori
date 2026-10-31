/**
 * Parses `box-shadow` into its shadows. The color and `inset` can come before
 * or after the lengths, like browsers serialize them, and the blur and spread
 * radii default to 0.
 * https://drafts.csswg.org/css-backgrounds-3/#box-shadow
 */

import valueParser from 'postcss-value-parser'
import { MATH_FUNCTION } from './math.js'

export interface BoxShadow<Length = string> {
  inset: boolean
  offsetX: Length
  offsetY: Length
  blurRadius: Length
  spreadRadius: Length
  color: string
}

const LENGTH = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:[a-z]+)?$/i

function isLength(component: string) {
  return LENGTH.test(component) || MATH_FUNCTION.test(component)
}

/**
 * The shadows of a `box-shadow` value, with their lengths as they're written.
 * Shadows without a color are drawn in `currentColor`.
 */
export function parseBoxShadow(
  value: string,
  currentColor: string
): BoxShadow[] {
  const invalid = () =>
    new Error(`Invalid value for CSS property "boxShadow": "${value}".`)
  if (value.trim().toLowerCase() === 'none') return []

  const shadows: string[][] = [[]]
  for (const node of valueParser(value).nodes) {
    if (node.type === 'div' && node.value === ',') shadows.push([])
    else if (node.type !== 'space' && node.type !== 'comment') {
      shadows[shadows.length - 1].push(valueParser.stringify(node))
    }
  }

  return shadows.map((components) => {
    const lengths: string[] = []
    let inset = false
    let color: string | undefined
    for (const component of components) {
      if (component.toLowerCase() === 'inset') {
        if (inset) throw invalid()
        inset = true
      } else if (isLength(component)) lengths.push(component)
      else if (color === undefined) color = component
      else throw invalid()
    }
    // The blur radius can't be negative.
    if (lengths.length < 2 || lengths.length > 4 || /^-/.test(lengths[2])) {
      throw invalid()
    }
    const [offsetX, offsetY, blurRadius = '0', spreadRadius = '0'] = lengths
    return {
      inset,
      offsetX,
      offsetY,
      blurRadius,
      spreadRadius,
      color: color ?? currentColor,
    }
  })
}
