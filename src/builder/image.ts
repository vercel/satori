import type { ParsedTransformOrigin } from '../transform-origin'

import { buildXMLString } from '../utils'
import border, { getBorderClipPath } from './border'
import radius from './border-radius'
import mask from './content-mask'
import { boxShadow } from './shadow'
import transform from './transform'

export default function image(
  {
    id,
    left,
    top,
    width,
    height,
    src,
    debug: _debug,
    isInheritingTransform,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    src: string
    isInheritingTransform: boolean
    debug?: boolean
  },
  style: Record<string, number | string>
) {
  if (style.display === 'none') return ''

  let contentMaskId = ''
  let contentMask = ''
  let clip = ''
  let opacity = 1
  let matrix = ''
  let defs = ''
  let borderShape = ''

  if (style.transform) {
    matrix = transform(
      {
        left,
        top,
        width,
        height,
      },
      style.transform as unknown as number[],
      isInheritingTransform,
      style.transformOrigin as ParsedTransformOrigin | undefined
    )
  }

  const preserveAspectRatio =
    style.objectFit === 'contain'
      ? 'xMidYMid'
      : style.objectFit === 'cover'
      ? 'xMidYMid slice'
      : 'none'

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )

  const clipPathId = style._inheritedClipPathId as number | undefined
  const overflowMaskId = style._inheritedMaskId as number | undefined

  if (path) {
    clip = buildXMLString(
      'clipPath',
      {
        id: `satori_c-${id}`,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
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

  const borderClip = getBorderClipPath(
    {
      id,
      left,
      top,
      width,
      height,
      currentClipPathId: clipPathId,
      borderPath: path,
      borderType: path ? 'path' : 'rect',
    },
    style
  )

  if (borderClip) {
    defs += borderClip[0]
    const rectClipId = borderClip[1]

    borderShape += border(
      {
        left,
        top,
        width,
        height,
        props: {
          transform: matrix ? matrix : undefined,
          // When using `background-clip: text`, we need to draw the extra border because
          // it shouldn't be clipped by the clip path, so we are not using currentClipPath here.
          'clip-path': `url(#${rectClipId})`,
          mask: overflowMaskId ? `url(#${overflowMaskId})` : undefined,
        },
      },
      style
    )
  }

  if (style.opacity) {
    opacity = +style.opacity
  }

  const shadow = boxShadow(
    {
      width,
      height,
      id,
      opacity,
      shape: buildXMLString(path ? 'path' : 'rect', {
        x: left,
        y: top,
        width,
        height,
        fill: '#fff',
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
        mask: overflowMaskId ? `url(#${overflowMaskId})` : undefined,
      }),
    },
    style
  )

  // If there is any border radius, we need to mask the content.
  if (path) {
    contentMaskId = `satori_cm-${id}`
    contentMask = mask(
      {
        id: `satori_cm-${id}`,
        left,
        top,
        width,
        height,
        matrix,
      },
      style
    )
  }

  // We need to subtract the border and padding sizes from the image size.
  const offsetLeft =
    ((style.borderLeftWidth as number) || 0) +
    ((style.paddingLeft as number) || 0)
  const offsetTop =
    ((style.borderTopWidth as number) || 0) +
    ((style.paddingTop as number) || 0)
  const offsetRight =
    ((style.borderRightWidth as number) || 0) +
    ((style.paddingRight as number) || 0)
  const offsetBottom =
    ((style.borderBottomWidth as number) || 0) +
    ((style.paddingBottom as number) || 0)

  return (
    (defs ? buildXMLString('defs', {}, defs) : '') +
    contentMask +
    (shadow ? shadow[0] : '') +
    clip +
    buildXMLString('image', {
      x: left + offsetLeft,
      y: top + offsetTop,
      width: width - offsetLeft - offsetRight,
      height: height - offsetTop - offsetBottom,
      href: src,
      preserveAspectRatio,
      opacity,
      transform: matrix ? matrix : undefined,
      'clip-path': clip
        ? `url(#satori_c-${id})`
        : clipPathId
        ? `url(#${clipPathId})`
        : undefined,
      mask: contentMaskId ? `url(#${contentMaskId})` : undefined,
    }) +
    (shadow ? shadow[1] : '') +
    borderShape
  )
}
