import { multiply } from '../utils'
import type { ParsedTransformOrigin } from '../transform-origin'

export default function transform(
  {
    left,
    top,
    width,
    height,
  }: {
    left: number
    top: number
    width: number
    height: number
  },
  matrix: number[],
  isInheritingTransform: boolean,
  transformOrigin?: ParsedTransformOrigin
) {
  let result: number[]

  // Calculate the transform origin.
  if (isInheritingTransform) {
    result = matrix
  } else {
    const xOrigin =
      transformOrigin?.xAbsolute ??
      ((transformOrigin?.xRelative ?? 50) * width) / 100
    const yOrigin =
      transformOrigin?.yAbsolute ??
      ((transformOrigin?.yRelative ?? 50) * height) / 100

    // If this element is the transform target, we attach the origin coordinates
    // to this matrix.
    const x = left + xOrigin
    const y = top + yOrigin

    // Due to the different coordinate systems, we need to move the shape to the
    // origin first, then apply the matrix, then move it back.
    result = multiply(
      [1, 0, 0, 1, x, y],
      multiply(matrix, [1, 0, 0, 1, -x, -y])
    )

    // And we need to apply its parent transform if it has one.
    if ((matrix as any).__parent) {
      result = multiply((matrix as any).__parent, result)
    }

    // Mutate self.
    matrix.splice(0, 6, ...result)
  }

  return `matrix(${result.map((v) => v.toFixed(2)).join(',')})`
}
