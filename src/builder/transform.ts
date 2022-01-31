import { multiply } from '../utils'

export default function transform(
  {
    left,
    top,
    width,
    height,
  }: { left: number; top: number; width: number; height: number },
  matrix: number[],
  isInheritingTransform: boolean
) {
  let result: number[]

  // Calculate the transform origin.
  if (isInheritingTransform) {
    result = matrix
  } else {
    // If this element is the transform target, we attach the origin coordinates
    // to this matrix.
    const x = left + width / 2
    const y = top + height / 2

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

  return `matrix(${result.join(',')})`
}
