import type { ParsedTransformOrigin } from '../transform-origin'

import backgroundImage from './background-image'
import radius from './border-radius'
import shadow from './shadow'
import transform from './transform'
import overflow from './overflow'
import { buildXMLString } from '../utils'

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
        backgrounds.push(image)
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
      'stroke-dasharray': strokeDashArray || undefined,
      transform: matrix || undefined,
      'clip-path': clipPathId ? `url(#${clipPathId})` : undefined,
    })
  }

  if (!fills.length) fills.push('transparent')

  const { backgroundClip, filter: cssFilter } = style

  // Each background generates a new rectangle.
  // @TODO: Not sure if this is the best way to do it, maybe <pattern> with
  // multiple <image>s is better.
  let shape = fills
    .map((fill, i) => {
      if (fill === 'transparent' && !(i === fills.length - 1 && strokeWidth)) {
        return ''
      }

      const hasStroke = !!strokeWidth
      const drawStroke =
        i === fills.length - 1 && hasStroke && backgroundClip !== 'text'

      let currentClipPath =
        backgroundClip === 'text'
          ? `url(#satori_bct-${id})`
          : clipPathId
          ? `url(#${clipPathId})`
          : undefined

      if (drawStroke) {
        // In SVG, stroke is always centered on the path and there is no
        // existing property to make it behave like CSS border. So here we
        // 2x the border width and introduce another clip path to clip the
        // overflowed part.

        defs += buildXMLString(
          'clipPath',
          {
            id: `satori_bc-${id}`,
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

        currentClipPath = `url(#satori_bc-${id})`
      }

      return buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        fill,
        stroke: drawStroke || hasStroke ? stroke : undefined,
        'stroke-width': drawStroke
          ? strokeWidth * 2
          : hasStroke
          ? // Here we work around some sub-pixel rendering issue caused by
            // clip-path by adding an extra stroke to the underlying fill layers.
            1
          : undefined,
        'stroke-dasharray': strokeDashArray || undefined,
        d: path ? path : undefined,
        transform: matrix ? matrix : undefined,
        'clip-path': currentClipPath,
        style: cssFilter ? `filter:${cssFilter}` : undefined,
      })
    })
    .join('')

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
