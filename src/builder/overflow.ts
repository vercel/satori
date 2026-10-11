/**
 * Generate clip path for the given element.
 */

import { buildXMLString } from '../utils.js'
import mask from './content-mask.js'
import radius from './border-radius.js'
import { buildClipPath, genClipPathId } from './clip-path.js'

// How far the clip region extends on an axis that isn't clipped.
const UNBOUNDED = 1e5

const rectPath = (x: number, y: number, w: number, h: number) =>
  `M${x},${y}h${w}v${h}h${-w}z`

/**
 * The clip region of `overflow`, if it isn't the padding box: an axis that
 * isn't clipped extends without limit, and `overflow: clip` on both axes is
 * extended by `overflow-clip-margin` from its box.
 * https://drafts.csswg.org/css-overflow-3/#overflow-clip-margin
 */
function clipRegion(
  box: { left: number; top: number; width: number; height: number },
  style: Record<string, string | number>
) {
  const clipX = style.overflowX !== 'visible'
  const clipY = style.overflowY !== 'visible'
  // The margin only applies to `overflow: clip` on both axes.
  const isClip = style.overflowX === 'clip' && style.overflowY === 'clip'
  const margin = isClip ? Number(style.overflowClipMargin) || 0 : 0
  const visualBox = isClip
    ? style._overflowClipBox || 'padding-box'
    : 'padding-box'
  if (clipX && clipY && !margin && visualBox === 'padding-box') return

  const inset = ['Top', 'Right', 'Bottom', 'Left'].map(
    (side) =>
      (visualBox === 'border-box'
        ? 0
        : (style[`border${side}Width`] as number) || 0) +
      (visualBox === 'content-box'
        ? (style[`padding${side}`] as number) || 0
        : 0) -
      margin
  )
  const { left, top, width, height } = box
  if (clipX && clipY) {
    return (
      radius(box, style, undefined, false, inset) ||
      rectPath(
        left + inset[3],
        top + inset[0],
        width - inset[1] - inset[3],
        height - inset[0] - inset[2]
      )
    )
  }
  const x = clipX ? left + inset[3] : left - UNBOUNDED
  const y = clipY ? top + inset[0] : top - UNBOUNDED
  return rectPath(
    x,
    y,
    (clipX ? left + width - inset[1] : left + width + UNBOUNDED) - x,
    (clipY ? top + height - inset[2] : top + height + UNBOUNDED) - y
  )
}

export default function overflow(
  {
    left,
    top,
    width,
    height,
    path,
    matrix,
    id,
    currentClipPath,
    src,
  }: {
    left: number
    top: number
    width: number
    height: number
    path: string
    matrix: string | undefined
    id: string
    currentClipPath: string | string
    src?: string
  },
  style: Record<string, string | number>,
  inheritableStyle: Record<string, string | number>
) {
  let overflowClipPath = ''
  const clipPath =
    style.clipPath && style.clipPath !== 'none'
      ? buildClipPath(
          { left, top, width, height, path, id, matrix, currentClipPath, src },
          style as Record<string, number>,
          inheritableStyle
        )
      : ''

  const region = src
    ? undefined
    : clipRegion({ left, top, width, height }, style)
  const transform =
    style.overflow === 'hidden' && style.transform && matrix
      ? matrix
      : undefined

  if (style.overflow !== 'hidden' && !src) {
    overflowClipPath = ''
  } else if (region) {
    // The clip path is the whole region, so the mask doesn't clip.
    return (
      clipPath +
      buildXMLString(
        'clipPath',
        {
          id: clipPath ? `satori_ocp-${id}` : genClipPathId(id),
          'clip-path': currentClipPath,
        },
        buildXMLString('path', { d: region, transform })
      ) +
      buildXMLString(
        'mask',
        { id: `satori_om-${id}` },
        buildXMLString('path', {
          d: rectPath(
            left - UNBOUNDED,
            top - UNBOUNDED,
            width + UNBOUNDED * 2,
            height + UNBOUNDED * 2
          ),
          fill: '#fff',
          mask: style._inheritedMaskId
            ? `url(#${style._inheritedMaskId})`
            : undefined,
        })
      )
    )
  } else {
    const _id = clipPath ? `satori_ocp-${id}` : genClipPathId(id)

    overflowClipPath = buildXMLString(
      'clipPath',
      {
        id: _id,
        'clip-path': currentClipPath,
      },
      buildXMLString(path ? 'path' : 'rect', {
        x: left,
        y: top,
        width,
        height,
        d: path ? path : undefined,
        // add transformation matrix to clip path if overflow is hidden AND a
        // transformation style is defined, otherwise children will be clipped
        // relative to the parent's original plane instead of the transformed
        // plane
        transform:
          style.overflow === 'hidden' && style.transform && matrix
            ? matrix
            : undefined,
      })
    )
  }

  const contentMask = mask(
    {
      id: `satori_om-${id}`,
      left,
      top,
      width,
      height,
      matrix,
      borderOnly: src ? false : true,
    },
    style
  )

  return clipPath + overflowClipPath + contentMask
}
