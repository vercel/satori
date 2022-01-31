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
  // Calculate the transform origin.
  let x = 0
  let y = 0
  if (isInheritingTransform) {
    ;[x, y] = (matrix as any).__origin
  } else {
    // If this element is the transform target, we attach the origin coordinates
    // to this matrix.
    x = left + width / 2
    y = top + height / 2
    ;(matrix as any).__origin = [x, y]
  }

  // Due to the different coordinate systems, we need to move the shape to the
  // origin first, then apply the matrix, then move it back.
  matrix = multiply(multiply([1, 0, 0, 1, x, y], matrix), [1, 0, 0, 1, -x, -y])

  return `matrix(${matrix.join(',')})`
}
