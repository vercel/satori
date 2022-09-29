import type { ParsedTransformOrigin } from '../transform-origin'

import backgroundImage from './background-image'
import radius from './border-radius'
import shadow from './shadow'
import transform from './transform'
import overflow from './overflow'
import { buildXMLString } from '../utils'
import border from './border'

export default async function rect(
  {
    id,
    left,
    top,
    width,
    height,
    isInheritingTransform,
    debug,
  }: {
    id: string
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    debug?: boolean
  },
  style: Record<string, number | string>
) {
  if (style.display === 'none') return ''

  let type = 'rect'
  let stroke = 'transparent'
  let strokeDashArray = ''
  let strokeWidth = 0
  let matrix = ''
  let defs = ''
  let fills: string[] = []
  let opacity = 1
  let extra = ''

  if (style.backgroundColor) {
    fills.push(style.backgroundColor as string)
  }

  if (style.borderWidth) {
    strokeWidth = style.borderWidth as number
    stroke = style.borderColor as string
    if (style.borderStyle === 'dashed') {
      strokeDashArray = strokeWidth * 2 + '  ' + strokeWidth
    }
  }

  if (style.opacity) {
    opacity = +style.opacity
  }

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

  let backgroundShapes = ''
  if (style.backgroundImage) {
    const backgrounds: string[][] = []

    for (
      let index = 0;
      index < (style.backgroundImage as any).length;
      index++
    ) {
      const background = (style.backgroundImage as any)[index]
      const image = await backgroundImage(
        { id: id + '_' + index, width, height },
        background
      )
      if (image) {
        // Background images that come first in the array are rendered last.
        backgrounds.unshift(image)
      }
    }

    for (const background of backgrounds) {
      fills.push(`url(#${background[0]})`)
      defs += background[1]
      if (background[2]) {
        backgroundShapes += background[2]
      }
    }
  }

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )
  if (path) {
    type = 'path'
  }

  const clip = overflow(
    { left, top, width, height, path, id },
    style as Record<string, number>
  )
  const clipPathId = style._inheritedClipPathId as number | undefined

  const filter = shadow({ width, height, id }, style)

  if (debug) {
    extra = buildXMLString('rect', {
      x: left,
      y: top,
      width,
      height,
      fill: 'transparent',
      stroke: '#ff5757',
      'stroke-width': 1,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  const { backgroundClip, filter: cssFilter } = style

  const currentClipPath =
    backgroundClip === 'text'
      ? `url(#satori_bct-${id})`
      : clipPathId
      ? `url(#${clipPathId})`
      : undefined

  // Each background generates a new rectangle.
  // @TODO: Not sure if this is the best way to do it, maybe <pattern> with
  // multiple <image>s is better.
  let shape = fills
    .map((fill) =>
      buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        fill,
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': currentClipPath,
        style: cssFilter ? `filter:${cssFilter}` : undefined,
      })
    )
    .join('')

  const hasStroke =
    style.borderTopWidth ||
    style.borderRightWidth ||
    style.borderBottomWidth ||
    style.borderLeftWidth
  const drawStroke = hasStroke && backgroundClip !== 'text'
  if (drawStroke) {
    // In SVG, stroke is always centered on the path and there is no
    // existing property to make it behave like CSS border. So here we
    // 2x the border width and introduce another clip path to clip the
    // overflowed part.
    const rectClipId = `satori_bc-${id}`
    defs += buildXMLString(
      'clipPath',
      {
        id: rectClipId,
        'clip-path': currentClipPath,
      },
      buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        d: path ? path : undefined,
      })
    )

    shape += border(
      {
        id,
        left,
        top,
        width,
        height,
        props: {
          transform: matrix ? matrix : undefined,
          'clip-path': `url(#${rectClipId})`,
        },
      },
      style
    )
  }

  // When using `background-clip: text`, we need to draw the extra border.
  if (backgroundClip === 'text' && strokeWidth) {
    shape =
      buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        fill: 'transparent',
        stroke,
        'stroke-width': strokeWidth * 2,
        'stroke-dasharray': strokeDashArray || undefined,
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
      }) + shape
  }

  return (
    (defs ? `<defs>${defs}</defs>` : '') +
    clip +
    (filter ? `${filter}<g filter="url(#satori_s-${id})">` : '') +
    (opacity !== 1 ? `<g opacity="${opacity}">` : '') +
    (backgroundShapes || shape) +
    (opacity !== 1 ? `</g>` : '') +
    (filter ? '</g>' : '') +
    extra
  )
}
