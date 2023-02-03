/**
 * Generate clip path for the given element.
 */

import { buildXMLString } from '../utils.js'
import mask from './content-mask.js'

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
  style: Record<string, string | number>
) {
  if (style.overflow !== 'hidden' && !src) {
    return ''
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

  return (
    buildXMLString(
      'clipPath',
      {
        id: `satori_cp-${id}`,
        'clip-path': currentClipPath,
      },
      buildXMLString(path ? 'path' : 'rect', {
        x: left,
        y: top,
        width,
        height,
        d: path ? path : undefined,
      })
    ) + contentMask
  )
}
