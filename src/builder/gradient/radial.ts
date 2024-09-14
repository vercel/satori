import {
  parseRadialGradient,
  RadialResult,
  RadialPropertyValue,
} from 'css-gradient-parser'
import { buildXMLString, lengthToNumber } from '../../utils.js'
import { normalizeStops } from './utils.js'

export function buildRadialGradient(
  {
    id,
    width,
    height,
    repeatX,
    repeatY,
  }: {
    id: string
    width: number
    height: number
    repeatX: boolean
    repeatY: boolean
  },
  image: string,
  dimensions: number[],
  offsets: number[],
  inheritableStyle: Record<string, number | string>,
  from?: 'background' | 'mask'
) {
  const {
    shape,
    stops: colorStops,
    position,
    size,
  } = parseRadialGradient(image)
  const [xDelta, yDelta] = dimensions

  let cx: number = xDelta / 2
  let cy: number = yDelta / 2

  const pos = calcRadialGradient(
    position.x,
    position.y,
    xDelta,
    yDelta,
    inheritableStyle.fontSize as number,
    inheritableStyle
  )
  cx = pos.x
  cy = pos.y

  const stops = normalizeStops(width, colorStops, inheritableStyle, false, from)

  const gradientId = `satori_radial_${id}`
  const patternId = `satori_pattern_${id}`
  const maskId = `satori_mask_${id}`

  // https://developer.mozilla.org/en-US/docs/Web/CSS/gradient/radial-gradient()#values
  const spread = calcRadius(
    shape as Shape,
    size,
    inheritableStyle.fontSize as number,
    { x: cx, y: cy },
    [xDelta, yDelta],
    inheritableStyle
  )

  // TODO: check for repeat-x/repeat-y
  const defs = buildXMLString(
    'pattern',
    {
      id: patternId,
      x: offsets[0] / width,
      y: offsets[1] / height,
      width: repeatX ? xDelta / width : '1',
      height: repeatY ? yDelta / height : '1',
      patternUnits: 'objectBoundingBox',
    },
    buildXMLString(
      'radialGradient',
      {
        id: gradientId,
      },
      stops
        .map((stop) =>
          buildXMLString('stop', {
            offset: stop.offset || 0,
            'stop-color': stop.color,
          })
        )
        .join('')
    ) +
      buildXMLString(
        'mask',
        {
          id: maskId,
        },
        buildXMLString('rect', {
          x: 0,
          y: 0,
          width: xDelta,
          height: yDelta,
          fill: '#fff',
        })
      ) +
      buildXMLString('rect', {
        x: 0,
        y: 0,
        width: xDelta,
        height: yDelta,
        fill: stops.at(-1)?.color || 'transparent',
      }) +
      buildXMLString(shape, {
        cx: cx,
        cy: cy,
        width: xDelta,
        height: yDelta,
        ...spread,
        fill: `url(#${gradientId})`,
        mask: `url(#${maskId})`,
      })
  )

  const result = [patternId, defs]
  return result
}

interface Position {
  type: 'keyword' | 'length'
  value: string
}

type PositionKeyWord = 'center' | 'left' | 'right' | 'top' | 'bottom'

function calcRadialGradient(
  cx: RadialPropertyValue,
  cy: RadialPropertyValue,
  xDelta: number,
  yDelta: number,
  baseFontSize: number,
  style: Record<string, string | number>
) {
  const pos: { x: number; y: number } = { x: xDelta / 2, y: yDelta / 2 }
  if (cx.type === 'keyword') {
    Object.assign(
      pos,
      calcPos(cx.value as PositionKeyWord, xDelta, yDelta, 'x')
    )
  } else {
    pos.x =
      lengthToNumber(
        `${cx.value.value}${cx.value.unit}`,
        baseFontSize,
        xDelta,
        style,
        true
      ) || xDelta / 2
  }

  if (cy.type === 'keyword') {
    Object.assign(
      pos,
      calcPos(cy.value as PositionKeyWord, xDelta, yDelta, 'y')
    )
  } else {
    pos.y =
      lengthToNumber(
        `${cy.value.value}${cy.value.unit}`,
        baseFontSize,
        yDelta,
        style,
        true
      ) || yDelta / 2
  }

  return pos
}

function calcPos(
  key: PositionKeyWord,
  xDelta: number,
  yDelta: number,
  dir: 'x' | 'y'
) {
  switch (key) {
    case 'center':
      return { [dir]: dir === 'x' ? xDelta / 2 : yDelta / 2 }
    case 'left':
      return { x: 0 }
    case 'top':
      return { y: 0 }
    case 'right':
      return { x: xDelta }
    case 'bottom':
      return { y: yDelta }
  }
}

type Shape = 'circle' | 'ellipse'
function calcRadius(
  shape: Shape,
  endingShape: RadialResult['size'],
  baseFontSize: number,
  centerAxis: { x: number; y: number },
  length: [number, number],
  inheritableStyle: Record<string, string | number>
) {
  const [xDelta, yDelta] = length
  const { x: cx, y: cy } = centerAxis
  const spread: Record<string, number> = {}
  let fx = 0
  let fy = 0

  if (isSizeAllLength(endingShape)) {
    if (endingShape.some((v) => v.value.value.startsWith('-'))) {
      throw new Error(
        'disallow setting negative values to the size of the shape. Check https://w3c.github.io/csswg-drafts/css-images/#valdef-rg-size-length-0'
      )
    }
    if (shape === 'circle') {
      return {
        r: Number(
          lengthToNumber(
            `${endingShape[0].value.value}${endingShape[0].value.unit}`,
            baseFontSize,
            xDelta,
            inheritableStyle,
            true
          )
        ),
      }
    } else {
      return {
        rx: Number(
          lengthToNumber(
            `${endingShape[0].value.value}${endingShape[0].value.unit}`,
            baseFontSize,
            xDelta,
            inheritableStyle,
            true
          )
        ),
        ry: Number(
          lengthToNumber(
            `${endingShape[1].value.value}${endingShape[1].value.unit}`,
            baseFontSize,
            yDelta,
            inheritableStyle,
            true
          )
        ),
      }
    }
  }

  switch (endingShape[0].value) {
    case 'farthest-corner':
      fx = Math.max(Math.abs(xDelta - cx), Math.abs(cx))
      fy = Math.max(Math.abs(yDelta - cy), Math.abs(cy))
      break
    case 'closest-corner':
      fx = Math.min(Math.abs(xDelta - cx), Math.abs(cx))
      fy = Math.min(Math.abs(yDelta - cy), Math.abs(cy))
      break
    case 'farthest-side':
      if (shape === 'circle') {
        spread.r = Math.max(
          Math.abs(xDelta - cx),
          Math.abs(cx),
          Math.abs(yDelta - cy),
          Math.abs(cy)
        )
      } else {
        spread.rx = Math.max(Math.abs(xDelta - cx), Math.abs(cx))
        spread.ry = Math.max(Math.abs(yDelta - cy), Math.abs(cy))
      }
      return spread
    case 'closest-side':
      if (shape === 'circle') {
        spread.r = Math.min(
          Math.abs(xDelta - cx),
          Math.abs(cx),
          Math.abs(yDelta - cy),
          Math.abs(cy)
        )
      } else {
        spread.rx = Math.min(Math.abs(xDelta - cx), Math.abs(cx))
        spread.ry = Math.min(Math.abs(yDelta - cy), Math.abs(cy))
      }

      return spread
  }
  if (shape === 'circle') {
    spread.r = Math.sqrt(fx * fx + fy * fy)
  } else {
    // Spec: https://drafts.csswg.org/css-images/#typedef-size
    // Get the aspect ratio of the closest-side size.
    const ratio = fy !== 0 ? fx / fy : 1

    if (fx === 0) {
      spread.rx = 0
      spread.ry = 0
    } else {
      // fx^2/a^2 + fy^2/b^2 = 1
      // fx^2/(b*ratio)^2 + fy^2/b^2 = 1
      // (fx^2+fy^2*ratio^2) = (b*ratio)^2
      // b = sqrt(fx^2+fy^2*ratio^2)/ratio

      spread.ry = Math.sqrt(fx * fx + fy * fy * ratio * ratio) / ratio
      spread.rx = spread.ry * ratio
    }
  }

  return spread
}

function isSizeAllLength(v: RadialPropertyValue[]): v is Array<{
  type: 'length'
  value: {
    unit: string
    value: string
  }
}> {
  return !v.some((s) => s.type === 'keyword')
}
