import type { ParsedTransformOrigin } from '../transform-origin.js'
import { buildXMLString } from '../utils.js'
import border from './border.js'
import radius, { resolveBorderRadii } from './border-radius.js'
import transform from './transform.js'

const CORNERS = [
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
]

/**
 * Draws the outline of a box: a border outside of its border edge, moved out
 * by `outline-offset`. Rounded corners of the box are rounded by the same
 * distance, and square ones stay square.
 * https://drafts.csswg.org/css-ui-4/#outline-props
 */
export default function outline(
  {
    id,
    left,
    top,
    width,
    height,
    isInheritingTransform,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
  },
  style: Record<string, any>
) {
  const lineStyle = style.outlineStyle
  const lineWidth =
    typeof style.outlineWidth === 'number' ? style.outlineWidth : 3
  if (!lineStyle || lineStyle === 'none' || lineWidth <= 0) return ''

  const offset =
    typeof style.outlineOffset === 'number' ? style.outlineOffset : 0
  const spread = offset + lineWidth
  const box = {
    left: left - spread,
    top: top - spread,
    width: width + spread * 2,
    height: height + spread * 2,
  }
  if (box.width <= 0 || box.height <= 0) return ''

  // `auto` is drawn like `solid`.
  const sideStyle = lineStyle === 'auto' ? 'solid' : lineStyle
  const outlineStyle: Record<string, number | string> = {}
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
    outlineStyle[`border${side}Width`] = lineWidth
    outlineStyle[`border${side}Style`] = sideStyle
    outlineStyle[`border${side}Color`] = style.outlineColor ?? style.color
  }
  resolveBorderRadii({ width, height }, style)?.forEach(([x, y], i) => {
    outlineStyle[CORNERS[i]] =
      x > 0 && y > 0
        ? `${Math.max(0, x + spread)}px ${Math.max(0, y + spread)}px`
        : 0
  })

  const matrix = style.transform
    ? transform(
        { left, top, width, height },
        style.transform,
        isInheritingTransform,
        style.transformOrigin as ParsedTransformOrigin | undefined
      )
    : ''

  // The outline is clipped by the `overflow` of ancestors, not its own. A
  // transformed outline is clipped as a group, since the clip paths of
  // ancestors aren't transformed.
  const clipPathId = style._inheritedClipPathId as string | undefined
  const maskId = style._inheritedMaskId as string | undefined
  const clipId = `satori_oc-${id}`
  const edge =
    radius(box, outlineStyle) ||
    `M${box.left},${box.top}h${box.width}v${box.height}h${-box.width}z`
  const defs = buildXMLString(
    'defs',
    {},
    buildXMLString(
      'clipPath',
      {
        id: clipId,
        'clip-path': clipPathId && !matrix ? `url(#${clipPathId})` : undefined,
      },
      buildXMLString('path', { d: edge })
    )
  )
  const lines = border(
    {
      id: `${id}-outline`,
      ...box,
      props: {
        transform: matrix || undefined,
        'clip-path': `url(#${clipId})`,
      },
    },
    outlineStyle
  )
  if (!lines) return ''
  return (
    defs +
    (maskId || (matrix && clipPathId)
      ? buildXMLString(
          'g',
          {
            'clip-path':
              matrix && clipPathId ? `url(#${clipPathId})` : undefined,
            mask: maskId ? `url(#${maskId})` : undefined,
          },
          lines
        )
      : lines)
  )
}
