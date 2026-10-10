/**
 * Converts the `transform` attribute of an SVG element to a CSS `matrix()`,
 * or returns `undefined` if it's invalid. Unlike CSS, its functions take
 * unitless numbers, in degrees for angles, and `rotate()` takes an optional
 * center: https://www.w3.org/TR/css-transforms-1/#svg-syntax
 */
export function svgTransformToCSS(value: string): string | undefined {
  const functionPattern = /\s*([a-zA-Z]+)\s*\(([^)]*)\)\s*,?/y
  let matrix = [1, 0, 0, 1, 0, 0]
  let position = 0
  let match: RegExpExecArray | null
  while ((match = functionPattern.exec(value))) {
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
    const fn = args.some(isNaN) ? undefined : getMatrix(match[1], args)
    if (!fn) return
    matrix = multiply(matrix, fn)
    position = functionPattern.lastIndex
  }
  if (!position || value.slice(position).trim()) return
  return `matrix(${matrix.map((n) => +n.toFixed(6)).join(',')})`
}

type Matrix = number[]

function getMatrix(name: string, args: number[]): Matrix | undefined {
  const rad = (args[0] * Math.PI) / 180
  switch (name) {
    case 'matrix':
      return args.length === 6 ? args : undefined
    case 'translate':
      return args.length === 1 || args.length === 2
        ? [1, 0, 0, 1, args[0], args[1] ?? 0]
        : undefined
    case 'scale':
      return args.length === 1 || args.length === 2
        ? [args[0], 0, 0, args[1] ?? args[0], 0, 0]
        : undefined
    case 'rotate': {
      if (args.length !== 1 && args.length !== 3) return
      const [cos, sin] = [Math.cos(rad), Math.sin(rad)]
      const [cx, cy] = [args[1] ?? 0, args[2] ?? 0]
      return [
        cos,
        sin,
        -sin,
        cos,
        cx - cos * cx + sin * cy,
        cy - sin * cx - cos * cy,
      ]
    }
    case 'skewX':
      return args.length === 1 ? [1, 0, Math.tan(rad), 1, 0, 0] : undefined
    case 'skewY':
      return args.length === 1 ? [1, Math.tan(rad), 0, 1, 0, 0] : undefined
  }
}

function multiply(
  [a1, b1, c1, d1, e1, f1]: Matrix,
  [a2, b2, c2, d2, e2, f2]: Matrix
) {
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ]
}
