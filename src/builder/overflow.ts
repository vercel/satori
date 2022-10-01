/**
 * Generate clip path for the given element.
 */

import { buildXMLString } from '../utils'
import mask from './content-mask'

export default function overflow(
  {
    left,
    top,
    width,
    height,
    path,
    matrix,
    id,
  }: {
    left: number
    top: number
    width: number
    height: number
    path: string
    matrix: string | undefined
    id: string
  },
  style: Record<string, string | number>
) {
  if (style.overflow !== 'hidden') {
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
      borderOnly: true,
    },
    style
  )

  return (
    buildXMLString(
      'clipPath',
      {
        id: `satori_cp-${id}`,
        'clip-path': style._inheritedClipPathId
          ? `url(#${style._inheritedClipPathId})`
          : undefined,
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
