/**
 * Perspective for `satori/experimental`.
 *
 * SVG only has affine transforms, which can't express perspective. An element
 * with perspective is drawn on its own plane, then split into triangles. Each
 * triangle shows the element through the affine transform that maps its three
 * corners exactly, so the error is largest inside the triangles and shrinks
 * as they get smaller. The element is rendered once and reused with `<use>`.
 */

import type { Box, Mat4, ProjectPlane } from '../builder/transform.js'
import type { YogaNode } from '../yoga.js'
import { buildXMLString } from '../utils.js'

// Maximum distance in px between a point's exact and approximate positions.
// Compared with Chrome, 0.25px looks the same and doubles the triangles.
const TOLERANCE = 0.5
// Up to 256 grid cells, i.e. 512 triangles.
const MAX_DIVISIONS = 32
const MAX_CELLS = 256

type Point = [x: number, y: number]

function format(value: number) {
  return +value.toFixed(3)
}

/**
 * The affine transform mapping the triangle `from` to `to`, as
 * `[a, b, c, d, e, f]` like SVG `matrix()`.
 */
function affine([p0, p1, p2]: Point[], [q0, q1, q2]: Point[]) {
  const x1 = p1[0] - p0[0]
  const y1 = p1[1] - p0[1]
  const x2 = p2[0] - p0[0]
  const y2 = p2[1] - p0[1]
  const det = x1 * y2 - x2 * y1

  const solve = (u0: number, u1: number, u2: number) => {
    const dx = ((u1 - u0) * y2 - (u2 - u0) * y1) / det
    const dy = ((u2 - u0) * x1 - (u1 - u0) * x2) / det
    return [dx, dy, u0 - dx * p0[0] - dy * p0[1]]
  }
  const [a, c, e] = solve(q0[0], q1[0], q2[0])
  const [b, d, f] = solve(q0[1], q1[1], q2[1])
  return [a, b, c, d, e, f]
}

function apply([a, b, c, d, e, f]: number[], [x, y]: Point): Point {
  return [a * x + c * y + e, b * x + d * y + f]
}

/**
 * Split the plane area into a grid of triangles, given as corners on the
 * plane.
 */
function triangulate(
  { left, top, width, height }: Box,
  columns: number,
  rows: number
) {
  const triangles: Point[][] = []
  const point = (i: number, j: number): Point => [
    left + (width * i) / columns,
    top + (height * j) / rows,
  ]
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = point(i, j)
      const b = point(i + 1, j)
      const c = point(i + 1, j + 1)
      const d = point(i, j + 1)
      triangles.push([a, b, c], [a, c, d])
    }
  }
  return triangles
}

function tessellate(svg: string, m: Mat4, bounds: Box, id: string) {
  const project = ([x, y]: Point): Point & { w?: number } => {
    const w = m[3] * x + m[7] * y + m[15]
    const point: Point & { w?: number } = [
      (m[0] * x + m[4] * y + m[12]) / w,
      (m[1] * x + m[5] * y + m[13]) / w,
    ]
    point.w = w
    return point
  }

  // Triangle edges are drawn without anti-aliasing, so that neighbors cover
  // every pixel exactly once. Extend the area so the content's own edges are
  // inside the triangles and stay anti-aliased.
  const area = {
    left: bounds.left - 1,
    top: bounds.top - 1,
    width: bounds.width + 2,
    height: bounds.height + 2,
  }

  // The largest error of a grid, checked at the center and edge midpoints of
  // each triangle. Stops early once it's above the tolerance.
  const getError = (columns: number, rows: number) => {
    let error = 0
    for (const triangle of triangulate(area, columns, rows)) {
      const projected = triangle.map(project)
      if (projected.some((point) => !(point.w > 0))) continue
      const transform = affine(triangle, projected)
      const [p0, p1, p2] = triangle
      for (const sample of [
        [(p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3],
        [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2],
        [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2],
        [(p0[0] + p2[0]) / 2, (p0[1] + p2[1]) / 2],
      ] as Point[]) {
        const exact = project(sample)
        const approximate = apply(transform, sample)
        error = Math.max(
          error,
          Math.hypot(exact[0] - approximate[0], exact[1] - approximate[1])
        )
        if (error > TOLERANCE) return error
      }
    }
    return error
  }

  // Use the grid with the fewest cells that keeps the error within the
  // tolerance. Perspective often distorts more along one axis, e.g. along x
  // for `rotateY()`, so columns and rows are chosen separately.
  // If none is within the tolerance, spread the most cells evenly.
  let grid = [Math.sqrt(MAX_CELLS), Math.sqrt(MAX_CELLS)]
  let cells = MAX_CELLS + 1
  for (let columns = 1; columns <= MAX_DIVISIONS; columns++) {
    for (let rows = 1; rows <= MAX_DIVISIONS; rows++) {
      if (columns * rows >= cells) break
      if (getError(columns, rows) <= TOLERANCE) {
        grid = [columns, rows]
        cells = columns * rows
        break
      }
    }
  }
  const triangles = triangulate(area, grid[0], grid[1])

  let clipPaths = ''
  let pieces = ''
  triangles.forEach((triangle, i) => {
    const projected = triangle.map(project)
    // Parts behind the viewer aren't drawn.
    if (projected.some((point) => !(point.w > 0))) return

    // Element IDs never contain `_`, so these can't collide with them.
    const clipPathId = `${id}_${i}`
    clipPaths += buildXMLString(
      'clipPath',
      { id: clipPathId },
      buildXMLString('path', {
        d: `M${projected
          .map(([x, y]) => `${format(x)},${format(y)}`)
          .join('L')}Z`,
        'shape-rendering': 'crispEdges',
      })
    )
    pieces += buildXMLString(
      'g',
      { 'clip-path': `url(#${clipPathId})` },
      buildXMLString('use', {
        href: `#${id}`,
        transform: `matrix(${affine(triangle, projected)
          .map((v) => +v.toFixed(6))
          .join(',')})`,
      })
    )
  })

  return (
    buildXMLString('defs', {}, buildXMLString('g', { id }, svg) + clipPaths) +
    pieces
  )
}

/**
 * The area an element and its descendants occupy before transforms, in
 * absolute coordinates.
 */
function getSubtreeBounds(node: YogaNode, left: number, top: number) {
  const { width, height } = node.getComputedLayout()
  const bounds = { left, top, right: left + width, bottom: top + height }
  for (let i = 0; i < node.getChildCount(); i++) {
    const child = node.getChild(i)
    const offset = child.getComputedLayout()
    const inner = getSubtreeBounds(child, left + offset.left, top + offset.top)
    bounds.left = Math.min(bounds.left, inner.left)
    bounds.top = Math.min(bounds.top, inner.top)
    bounds.right = Math.max(bounds.right, inner.right)
    bounds.bottom = Math.max(bounds.bottom, inner.bottom)
  }
  return bounds
}

/**
 * Draw an element with perspective. References to clip paths and masks
 * inherited from ancestors are moved outside, because those are defined in
 * the space the projected result is drawn in.
 */
export const projectPlane: ProjectPlane = (
  svg,
  { matrix, node, left, top, style, id }
) => {
  // Skip elements that draw nothing themselves, such as a `preserve-3d`
  // container: everything is inside definitions like masks and clip paths.
  if (
    !/<(?:rect|path|image|text|use|circle|ellipse|line|polygon|polyline)\b/.test(
      svg.replace(
        /<(mask|clipPath|defs|pattern|filter|linearGradient|radialGradient)\b[\s\S]*?<\/\1>/g,
        ''
      )
    )
  ) {
    return svg
  }

  const clipPath = style._inheritedClipPathId as string | undefined
  const mask = style._inheritedMaskId as string | undefined
  if (clipPath) svg = svg.split(`clip-path="url(#${clipPath})"`).join('')
  if (mask) svg = svg.split(`mask="url(#${mask})"`).join('')

  // Include the area of shadows, which are drawn outside the box.
  let shadow = 0
  for (const s of (style.boxShadow as unknown as any[]) || []) {
    if (s.inset) continue
    shadow = Math.max(
      shadow,
      Math.max(Math.abs(s.offsetX), Math.abs(s.offsetY)) +
        s.blurRadius * 2 +
        Math.max(s.spreadRadius || 0, 0)
    )
  }
  const bounds = getSubtreeBounds(node, left, top)
  const projected = tessellate(
    svg,
    matrix,
    {
      left: bounds.left - shadow,
      top: bounds.top - shadow,
      width: bounds.right - bounds.left + shadow * 2,
      height: bounds.bottom - bounds.top + shadow * 2,
    },
    `satori_pp-${id}`
  )

  return clipPath || mask
    ? buildXMLString(
        'g',
        {
          'clip-path': clipPath ? `url(#${clipPath})` : undefined,
          mask: mask ? `url(#${mask})` : undefined,
        },
        projected
      )
    : projected
}
