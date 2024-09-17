/**
 * Generate clip path for the given element.
 */

import { buildXMLString } from '../utils.js'
import mask from './content-mask.js'
import { buildClipPath, genClipPathId } from './clip-path.js'

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

  if (style.overflow !== 'hidden' && !src) {
    overflowClipPath = ''
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
