import { multiply } from '../utils.js'
import type { ParsedTransformOrigin } from '../transform-origin.js'

const baseMatrix = [1, 0, 0, 1, 0, 0]

// Mutate the array in place.
function resolveTransforms(transforms: any[], width: number, height: number) {
  let matrix = [...baseMatrix]

  // Handle CSS transforms To make it easier, we convert different transform
  // types directly to a matrix and apply it recursively to all its children.
  // Transforms are applied from right to left.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  for (const transform of transforms) {
    const type = Object.keys(transform)[0]
    let v = transform[type]

    // Resolve percentages based on the element's final size.
    if (typeof v === 'string') {
      if (type === 'translateX') {
        v = (parseFloat(v) / 100) * width
        // Override the original object.
        transform[type] = v
      } else if (type === 'translateY') {
        v = (parseFloat(v) / 100) * height
        transform[type] = v
      } else {
        throw new Error(`Invalid transform: "${type}: ${v}".`)
      }
    }

    let len = v as number

    const transformMatrix = [...baseMatrix]
    switch (type) {
      case 'translateX':
        transformMatrix[4] = len
        break
      case 'translateY':
        transformMatrix[5] = len
        break
      case 'scale':
        transformMatrix[0] = len
        transformMatrix[3] = len
        break
      case 'scaleX':
        transformMatrix[0] = len
        break
      case 'scaleY':
        transformMatrix[3] = len
        break
      case 'rotate': {
        const rad = (len * Math.PI) / 180
        const c = Math.cos(rad)
        const s = Math.sin(rad)
        transformMatrix[0] = c
        transformMatrix[1] = s
        transformMatrix[2] = -s
        transformMatrix[3] = c
        break
      }
      case 'skewX':
        transformMatrix[2] = Math.tan((len * Math.PI) / 180)
        break
      case 'skewY':
        transformMatrix[1] = Math.tan((len * Math.PI) / 180)
        break
    }
    matrix = multiply(transformMatrix, matrix)
  }

  transforms.splice(0, transforms.length)
  transforms.push(...matrix)
  ;(transforms as any).__resolved = true
}

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
  transforms: number[],
  isInheritingTransform: boolean,
  transformOrigin?: ParsedTransformOrigin
) {
  let result: number[]

  if (!(transforms as any).__resolved) {
    resolveTransforms(transforms, width, height)
  }

  let matrix = transforms

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
