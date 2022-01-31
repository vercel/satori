import { multiply } from '../utils'

export default function transform(
  {
    left,
    top,
    width,
    height,
  }: { left: number; top: number; width: number; height: number },
  matrix: number[]
) {
  // Due to the different coordinate systems, we need to move the shape to the
  // origin first, then apply the matrix, then move it back.
  const x = left + width / 2
  const y = top + height / 2
  matrix = multiply(multiply([1, 0, 0, 1, x, y], matrix), [1, 0, 0, 1, -x, -y])

  return `matrix(${matrix.join(',')})`
}
