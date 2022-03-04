/**
 * Generate clip path for the given element.
 */

import { buildXMLString } from '../utils'

export default function overflow(
  {
    left,
    top,
    width,
    height,
    path,
    id,
  }: {
    left: number
    top: number
    width: number
    height: number
    path: string
    id: string
  },
  style: Record<string, string | number>
) {
  if (style.overflow !== 'hidden') {
    return ''
  }

  if (path) {
    // <clipPath id="myClip"><circle cx="40" cy="35" r="35" /></clipPath>
    return buildXMLString(
      'clipPath',
      {
        id: `satori_cp-${id}`,
        'clip-path': style._inheritedClipPathId
          ? `url(#${style._inheritedClipPathId})`
          : undefined,
      },
      buildXMLString('path', {
        x: left,
        y: top,
        width,
        height,
        d: path,
      })
    )
  }
  return buildXMLString(
    'clipPath',
    {
      id: `satori_cp-${id}`,
      'clip-path': style._inheritedClipPathId
        ? `url(#${style._inheritedClipPathId})`
        : undefined,
    },
    buildXMLString('rect', {
      x: left,
      y: top,
      width,
      height,
    })
  )
}
