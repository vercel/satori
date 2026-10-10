/**
 * CSS transforms, including 3D transforms.
 *
 * Every element draws its shapes on its own plane: z = 0, in the absolute
 * layout coordinates computed by the layout engine. A 4x4 matrix (`TransformState.world`)
 * maps that plane to the space the shapes are drawn in. Without perspective,
 * the mapping is affine and becomes an SVG `matrix()`. With perspective it
 * isn't, and the element is either drawn with a projection hook provided by
 * `satori/experimental`, or approximated by an affine mapping.
 *
 * https://drafts.csswg.org/css-transforms-2/#3d-rendering-contexts
 */

import type { ParsedTransformOrigin } from '../transform-origin.js'
import type { TransformFunction } from '../parser/transform.js'
import type { CalcLength, LayoutNode } from '../layout-engine/index.js'
import type { SerializedStyle } from '../handler/expand.js'

/** A 4x4 matrix in column-major order, like the arguments of `matrix3d()`. */
export type Mat4 = number[]

export interface Box {
  left: number
  top: number
  width: number
  height: number
}

export interface ProjectedElement {
  /** Maps the element's plane to the space the result is drawn in. */
  matrix: Mat4
  node: LayoutNode
  left: number
  top: number
  style: SerializedStyle
  id: string
}

/**
 * Draws an element with perspective, see `satori/experimental`. `svg` is the
 * element and its flat descendants, drawn on the element's plane.
 */
export type ProjectPlane = (svg: string, element: ProjectedElement) => string

// prettier-ignore
const IDENTITY: Mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]

// Drops the z coordinate, flattening 3D content onto the z = 0 plane.
// prettier-ignore
const FLATTEN: Mat4 = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 0, 0,
  0, 0, 0, 1,
]

/** a · b, i.e. b is applied first. */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const result: Mat4 = new Array(16)
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      result[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3]
    }
  }
  return result
}

function translate(x: number, y: number, z: number): Mat4 {
  // prettier-ignore
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1,
  ]
}

function scale(x: number, y: number, z: number): Mat4 {
  // prettier-ignore
  return [
    x, 0, 0, 0,
    0, y, 0, 0,
    0, 0, z, 0,
    0, 0, 0, 1,
  ]
}

function rotate(x: number, y: number, z: number, degrees: number): Mat4 {
  const length = Math.hypot(x, y, z)
  // A zero vector means no rotation.
  if (!length) return IDENTITY
  x /= length
  y /= length
  z /= length

  const radians = (degrees * Math.PI) / 180
  const c = Math.cos(radians)
  const s = Math.sin(radians)
  const t = 1 - c
  // prettier-ignore
  return [
    t * x * x + c,     t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c,     t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c,     0,
    0,                 0,                 0,                 1,
  ]
}

function skew(xDegrees: number, yDegrees: number): Mat4 {
  const x = Math.tan((xDegrees * Math.PI) / 180)
  const y = Math.tan((yDegrees * Math.PI) / 180)
  // prettier-ignore
  return [
    1, y, 0, 0,
    x, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ]
}

function perspective(distance: number): Mat4 {
  // `perspective(none)` is resolved to Infinity, which gives the identity.
  // Distances below 1px are clamped to 1px, like browsers do.
  const d = -1 / Math.max(distance, 1)
  // prettier-ignore
  return [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, d,
    0, 0, 0, 1,
  ]
}

function toMatrix(
  { name, args }: TransformFunction,
  width: number,
  height: number
): Mat4 {
  // Percentages are only allowed in X and Y translations.
  const resolve = (
    value: number | string | CalcLength | undefined,
    size: number
  ) =>
    typeof value === 'string'
      ? (parseFloat(value) / 100) * size
      : typeof value === 'object'
      ? value.calc(size)
      : value ?? 0
  const [a, b, c, d] = args as number[]

  switch (name) {
    case 'matrix': {
      const [, , , , e, f] = args as number[]
      // prettier-ignore
      return [
        a, b, 0, 0,
        c, d, 0, 0,
        0, 0, 1, 0,
        e, f, 0, 1,
      ]
    }
    case 'matrix3d':
      return args as number[]
    case 'translate':
      return translate(resolve(a, width), resolve(b, height), 0)
    case 'translateX':
      return translate(resolve(a, width), 0, 0)
    case 'translateY':
      return translate(0, resolve(a, height), 0)
    case 'translateZ':
      return translate(0, 0, a)
    case 'translate3d':
      return translate(resolve(a, width), resolve(b, height), c)
    case 'scale':
      return scale(a, b ?? a, 1)
    case 'scaleX':
      return scale(a, 1, 1)
    case 'scaleY':
      return scale(1, a, 1)
    case 'scaleZ':
      return scale(1, 1, a)
    case 'scale3d':
      return scale(a, b, c)
    case 'rotate':
    case 'rotateZ':
      return rotate(0, 0, 1, a)
    case 'rotateX':
      return rotate(1, 0, 0, a)
    case 'rotateY':
      return rotate(0, 1, 0, a)
    case 'rotate3d':
      return rotate(a, b, c, d)
    case 'skew':
      return skew(a, b ?? 0)
    case 'skewX':
      return skew(a, 0)
    case 'skewY':
      return skew(0, a)
    case 'perspective':
      return perspective(a)
    default:
      throw new Error(`Invalid transform function: "${name}".`)
  }
}

/**
 * Wraps a matrix so it applies around an origin given relative to a box.
 */
function aroundOrigin(
  matrix: Mat4,
  { left, top, width, height }: Box,
  origin: ParsedTransformOrigin | undefined
): Mat4 {
  const x =
    left + (origin?.xAbsolute ?? ((origin?.xRelative ?? 50) * width) / 100)
  const y =
    top + (origin?.yAbsolute ?? ((origin?.yRelative ?? 50) * height) / 100)
  const z = origin?.zAbsolute ?? 0
  return multiply(translate(x, y, z), multiply(matrix, translate(-x, -y, -z)))
}

export interface TransformState {
  /** Maps the element's plane to the space its shapes are drawn in. */
  world: Mat4
  /**
   * The element's 3D transform since the last flattening, and the mapping of
   * the plane it was flattened onto: `world = base · local`. Elements in the
   * same 3D rendering context share `base`, and `local` gives their depth.
   */
  base: Mat4
  local: Mat4
  /** Whether children keep their 3D position (`transform-style: preserve-3d`). */
  preserve3d: boolean
  /** The `perspective` property, applied to children. */
  perspective?: Mat4
  /**
   * Set if the element's mapping isn't affine and it's drawn with a
   * projection instead: its shapes and flat descendants are then drawn on its
   * own plane (`world` is the identity) and the result is projected with this
   * matrix.
   */
  projection?: Mat4
  /** Whether the element is entirely behind the viewer, so it isn't drawn. */
  behindViewer?: boolean
}

export const ROOT_TRANSFORM_STATE: TransformState = {
  world: IDENTITY,
  base: IDENTITY,
  local: IDENTITY,
  preserve3d: false,
}

/** The w coordinate of a point on an element's plane. */
function w(m: Mat4, x: number, y: number) {
  return m[3] * x + m[7] * y + m[15]
}

/**
 * Compute how an element is transformed, after layout.
 */
export function resolveTransformState({
  functions,
  box,
  origin,
  parent,
  preserve3d,
  perspectiveDistance,
  perspectiveOrigin,
  canProject,
}: {
  functions: TransformFunction[]
  box: Box
  origin?: ParsedTransformOrigin
  parent: TransformState
  preserve3d: boolean
  perspectiveDistance?: number
  perspectiveOrigin?: ParsedTransformOrigin
  canProject: boolean
}): TransformState {
  let matrix = IDENTITY
  for (const fn of functions) {
    matrix = multiply(matrix, toMatrix(fn, box.width, box.height))
  }
  matrix = aroundOrigin(matrix, box, origin)
  if (parent.perspective) matrix = multiply(parent.perspective, matrix)

  // Children of a `preserve-3d` element stay in its 3D space. Otherwise, the
  // element is flattened onto its parent's plane.
  const base = parent.preserve3d ? parent.base : multiply(parent.world, FLATTEN)
  const local = parent.preserve3d ? multiply(parent.local, matrix) : matrix
  let world = multiply(base, local)

  // With perspective, the w coordinate varies across the element's plane, so
  // the mapping isn't affine.
  const { left, top, width, height } = box
  const ws = [
    w(world, left, top),
    w(world, left + width, top),
    w(world, left, top + height),
    w(world, left + width, top + height),
  ]
  const center = w(world, left + width / 2, top + height / 2)
  const isAffine = ws.every((value) => Math.abs(value - center) < 1e-6)

  let projection: Mat4 | undefined
  if (!isAffine && canProject) {
    projection = world
    world = IDENTITY
  } else if (world[3] || world[7] || world[15] !== 1) {
    // Approximate the mapping by the affine one that matches it best around
    // the element's center: its value and derivatives there. That's exact for
    // planes facing the viewer, such as `translateZ()` with perspective.
    const cx = left + width / 2
    const cy = top + height / 2
    const x = (world[0] * cx + world[4] * cy + world[12]) / center
    const y = (world[1] * cx + world[5] * cy + world[13]) / center
    const dxdx = (world[0] - x * world[3]) / center
    const dxdy = (world[4] - x * world[7]) / center
    const dydx = (world[1] - y * world[3]) / center
    const dydy = (world[5] - y * world[7]) / center
    world = [...world]
    world[0] = dxdx
    world[1] = dydx
    world[4] = dxdy
    world[5] = dydy
    world[12] = x - dxdx * cx - dxdy * cy
    world[13] = y - dydx * cx - dydy * cy
    world[3] = world[7] = 0
    world[15] = 1
  }

  return {
    world,
    base,
    local,
    preserve3d,
    perspective:
      perspectiveDistance !== undefined
        ? aroundOrigin(perspective(perspectiveDistance), box, perspectiveOrigin)
        : undefined,
    projection,
    behindViewer: ws.every((value) => value <= 0),
  }
}

/**
 * The depth of a point on an element's plane in its 3D rendering context.
 * Larger values are closer to the viewer.
 */
export function getDepth(state: TransformState, x: number, y: number) {
  const m = state.local
  return (m[2] * x + m[6] * y + m[14]) / w(m, x, y)
}

function determinant3(m: number[]) {
  return (
    m[0] * (m[4] * m[8] - m[5] * m[7]) -
    m[1] * (m[3] * m[8] - m[5] * m[6]) +
    m[2] * (m[3] * m[7] - m[4] * m[6])
  )
}

function determinant4(m: Mat4) {
  let result = 0
  for (let column = 0; column < 4; column++) {
    // The minor without row 0 and this column.
    const minor: number[] = []
    for (let c = 0; c < 4; c++) {
      if (c === column) continue
      minor.push(m[c * 4 + 1], m[c * 4 + 2], m[c * 4 + 3])
    }
    result += (column % 2 ? -1 : 1) * m[column * 4] * determinant3(minor)
  }
  return result
}

/**
 * Whether the back of the element faces the viewer, for
 * `backface-visibility: hidden`. Per the spec, that's when the z-z component
 * of the inverse of its accumulated 3D matrix is negative. That component is
 * the cofactor of z-z divided by the determinant.
 */
export function isBackFacing(state: TransformState) {
  const m = state.local
  const det = determinant4(m)
  if (!det) return false
  const cofactor = determinant3([
    m[0],
    m[1],
    m[3],
    m[4],
    m[5],
    m[7],
    m[12],
    m[13],
    m[15],
  ])
  return cofactor / det < 0
}

/**
 * Convert an affine mapping to an SVG `matrix()`.
 */
function toSVGMatrix(m: Mat4) {
  const divisor = m[15]
  // Keep 6 decimals: with only 2, `scale(1.005)` rendered as a plain shift and
  // `rotate(0.25deg)` as no rotation at all. 6 keep the error below 0.01px up
  // to 10,000px from the origin. Trailing zeros are dropped.
  return `matrix(${[m[0], m[1], m[4], m[5], m[12], m[13]]
    .map((v) => +(v / divisor).toFixed(6))
    .join(',')})`
}

/**
 * The SVG transform for the shapes of an element, from the transform state
 * attached to its (possibly inherited) transform list after layout.
 */
export default function transform(
  _box: Box,
  transforms: unknown,
  _isInheritingTransform: boolean,
  _transformOrigin?: ParsedTransformOrigin
) {
  const state = (transforms as { __state?: TransformState }).__state
  return toSVGMatrix((state ?? ROOT_TRANSFORM_STATE).world)
}
