/**
 * Generate clip path for the given element.
 */

import { buildXMLString } from '../utils.js'
import mask from './content-mask.js'
import { buildClipPath } from './clip-path.js'

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
  const clipPath =
    style.clipPath && style.clipPath !== 'none'
      ? buildClipPath(
          { left, top, width, height, path, id, matrix, currentClipPath, src },
          style as Record<string, number>,
          inheritableStyle
        )
      : ''
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
  if (style.overflow !== 'hidden' && !src) {
    return clipPath + contentMask
  }

  const _id = `satori_cp-${id}`

  return (
    buildXMLString(
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
      })
    ) +
    clipPath +
    contentMask
  )
}
