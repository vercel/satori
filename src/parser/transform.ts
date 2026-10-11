/**
 * Parser for the CSS `transform` property, including 3D transform functions.
 * https://drafts.csswg.org/css-transforms-2/#transform-functions
 */

import valueParser from 'postcss-value-parser'
import CssDimension from '../vendor/parse-css-dimension/index.js'
import { calcDegree } from '../utils.js'
import type { CalcLength } from '../layout-engine/node.js'
import { MATH_FUNCTION, parseMath } from './math.js'

export interface TransformFunction {
  name: string
  /**
   * After `resolveTransform`: lengths in px, angles in degrees, and plain
   * numbers. Percentages of the element's size, only allowed for the X and Y
   * translations, are kept as strings such as `'50%'`, or as `calc()`
   * expressions.
   */
  args: (number | string | CalcLength)[]
}

type ArgumentKind =
  | 'length'
  | 'lengthOrPercentage'
  | 'number'
  | 'scale'
  | 'angle'

const L: ArgumentKind = 'length'
const LP: ArgumentKind = 'lengthOrPercentage'
const N: ArgumentKind = 'number'
const S: ArgumentKind = 'scale'
const A: ArgumentKind = 'angle'

// The argument kinds of each function. Optional arguments are listed after
// `minArgs`.
const FUNCTIONS: Record<
  string,
  [name: string, minArgs: number, kinds: ArgumentKind[]]
> = {}
for (const [name, minArgs, kinds] of [
  ['matrix', 6, [N, N, N, N, N, N]],
  ['matrix3d', 16, Array(16).fill(N)],
  ['translate', 1, [LP, LP]],
  ['translateX', 1, [LP]],
  ['translateY', 1, [LP]],
  ['translateZ', 1, [L]],
  ['translate3d', 3, [LP, LP, L]],
  ['scale', 1, [S, S]],
  ['scaleX', 1, [S]],
  ['scaleY', 1, [S]],
  ['scaleZ', 1, [S]],
  ['scale3d', 3, [S, S, S]],
  ['rotate', 1, [A]],
  ['rotateX', 1, [A]],
  ['rotateY', 1, [A]],
  ['rotateZ', 1, [A]],
  ['rotate3d', 4, [N, N, N, A]],
  ['skew', 1, [A, A]],
  ['skewX', 1, [A]],
  ['skewY', 1, [A]],
  ['perspective', 1, [L]],
] as [string, number, ArgumentKind[]][]) {
  // Function names are case-insensitive.
  FUNCTIONS[name.toLowerCase()] = [name, minArgs, kinds]
}

/**
 * Split a `transform` value into functions with their raw arguments.
 */
export default function parseTransform(value: string): TransformFunction[] {
  const functions: TransformFunction[] = []
  const nodes = valueParser(value).nodes.filter(
    (node) => node.type !== 'space' && node.type !== 'comment'
  )

  if (
    nodes.length === 1 &&
    nodes[0].type === 'word' &&
    nodes[0].value.toLowerCase() === 'none'
  ) {
    return functions
  }

  for (const node of nodes) {
    const definition =
      node.type === 'function' ? FUNCTIONS[node.value.toLowerCase()] : undefined
    if (!definition) {
      throw new Error(
        `Invalid transform function: "${valueParser.stringify(node)}".`
      )
    }

    const [name, minArgs, kinds] = definition
    const args: string[] = []
    let expectsArgument = true
    for (const arg of (node as valueParser.FunctionNode).nodes) {
      if (arg.type === 'space' || arg.type === 'comment') continue
      if (arg.type === 'div' && arg.value === ',' && !expectsArgument) {
        expectsArgument = true
      } else if (
        expectsArgument &&
        (arg.type === 'word' ||
          (arg.type === 'function' &&
            MATH_FUNCTION.test(valueParser.stringify(arg))))
      ) {
        args.push(valueParser.stringify(arg))
        expectsArgument = false
      } else {
        throw new Error(
          `Invalid arguments in transform function "${valueParser.stringify(
            node
          )}".`
        )
      }
    }

    if (args.length < minArgs || args.length > kinds.length) {
      throw new Error(
        `Invalid number of arguments in transform function "${valueParser.stringify(
          node
        )}".`
      )
    }
    functions.push({ name, args })
  }

  return functions
}

function resolveArgument(
  arg: string,
  kind: ArgumentKind,
  toPixels: (length: string) => number | undefined
): number | string | CalcLength | undefined {
  if (MATH_FUNCTION.test(arg)) {
    const math = parseMath(arg, toPixels)
    if (!math) return
    // Percentages are of the element's size.
    if (math.percentage) {
      return kind === 'lengthOrPercentage' ? { calc: math.evaluate } : undefined
    }
    const expected = kind === 'number' || kind === 'scale' ? 'number' : 'length'
    return math.type === expected || kind === 'angle'
      ? math.evaluate(0)
      : undefined
  }

  let dimension: { type: string; value: number; unit?: string }
  try {
    dimension = new CssDimension(arg)
  } catch {
    return
  }

  switch (kind) {
    case 'number':
      return dimension.type === 'number' ? dimension.value : undefined
    case 'scale':
      return dimension.type === 'number'
        ? dimension.value
        : dimension.type === 'percentage'
        ? dimension.value / 100
        : undefined
    case 'angle':
      return dimension.type === 'angle'
        ? calcDegree(arg)
        : dimension.type === 'number' && dimension.value === 0
        ? 0
        : undefined
    case 'lengthOrPercentage':
      if (dimension.type === 'percentage') return arg
    // Fall through.
    case 'length':
      return dimension.type === 'length'
        ? toPixels(arg)
        : dimension.type === 'number' && dimension.value === 0
        ? 0
        : undefined
  }
}

/**
 * Resolve the arguments of parsed transform functions to numbers. Lengths are
 * converted to px with `toPixels`.
 */
export function resolveTransform(
  functions: TransformFunction[],
  toPixels: (length: string) => number | undefined
): TransformFunction[] {
  return functions.map(({ name, args }) => {
    const [, , kinds] = FUNCTIONS[name.toLowerCase()]
    return {
      name,
      args: args.map((arg, i) => {
        if (typeof arg !== 'string') return arg
        // `perspective(none)` is the identity transform.
        if (name === 'perspective' && arg.toLowerCase() === 'none') {
          return Infinity
        }
        // Units are case-insensitive.
        const resolved = resolveArgument(arg.toLowerCase(), kinds[i], toPixels)
        if (resolved === undefined) {
          throw new Error(
            `Invalid value "${arg}" in transform function ${name}().`
          )
        }
        return resolved
      }),
    }
  })
}
