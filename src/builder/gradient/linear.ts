import { parseLinearGradient } from 'css-gradient-parser'
import { normalizeStops } from './utils.js'
import { buildXMLString, calcDegree } from '../../utils.js'

export function buildLinearGradient(
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
  const parsed = parseLinearGradient(image)
  const [imageWidth, imageHeight] = dimensions

  // Calculate the direction.
  let x1, y1, x2, y2, length

  if (parsed.orientation.type === 'directional') {
    ;[x1, y1, x2, y2] = resolveXYFromDirection(parsed.orientation.value)

    length = Math.sqrt(
      Math.pow((x2 - x1) * imageWidth, 2) + Math.pow((y2 - y1) * imageHeight, 2)
    )
  } else if (parsed.orientation.type === 'angular') {
    const EPS = 0.000001
    const r = imageWidth / imageHeight

    function calc(angle) {
      angle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)

      if (Math.abs(angle - Math.PI / 2) < EPS) {
        x1 = 0
        y1 = 0
        x2 = 1
        y2 = 0
        length = imageWidth
        return
      } else if (Math.abs(angle) < EPS) {
        x1 = 0
        y1 = 1
        x2 = 0
        y2 = 0
        length = imageHeight
        return
      }

      // Assuming 0 <= angle < PI / 2.
      if (angle >= Math.PI / 2 && angle < Math.PI) {
        calc(Math.PI - angle)
        y1 = 1 - y1
        y2 = 1 - y2
        return
      } else if (angle >= Math.PI) {
        calc(angle - Math.PI)
        let tmp = x1
        x1 = x2
        x2 = tmp
        tmp = y1
        y1 = y2
        y2 = tmp
        return
      }

      // Remap SVG distortion
      const tan = Math.tan(angle)
      const tanTexture = tan * r
      const angleTexture = Math.atan(tanTexture)
      const l = Math.sqrt(2) * Math.cos(Math.PI / 4 - angleTexture)
      x1 = 0
      y1 = 1
      x2 = Math.sin(angleTexture) * l
      y2 = 1 - Math.cos(angleTexture) * l

      // Get the angle between the distored gradient direction and diagonal.
      const x = 1
      const y = 1 / tan
      const cosA = Math.abs(
        (x * r + y) / Math.sqrt(x * x + y * y) / Math.sqrt(r * r + 1)
      )

      // Get the distored gradient length.
      const diagonal = Math.sqrt(
        imageWidth * imageWidth + imageHeight * imageHeight
      )
      length = diagonal * cosA
    }

    console.log(
      calcDegree(
        `${parsed.orientation.value.value}${parsed.orientation.value.unit}`
      ),
      parsed.orientation
    )
    calc(
      (calcDegree(
        `${parsed.orientation.value.value}${parsed.orientation.value.unit}`
      ) /
        180) *
        Math.PI
    )
  }

  const stops = normalizeStops(length, parsed.stops, inheritableStyle, from)

  const gradientId = `satori_bi${id}`
  const patternId = `satori_pattern_${id}`

  const defs = buildXMLString(
    'pattern',
    {
      id: patternId,
      x: offsets[0] / width,
      y: offsets[1] / height,
      width: repeatX ? imageWidth / width : '1',
      height: repeatY ? imageHeight / height : '1',
      patternUnits: 'objectBoundingBox',
    },
    buildXMLString(
      'linearGradient',
      {
        id: gradientId,
        x1,
        y1,
        x2,
        y2,
      },
      stops
        .map((stop) =>
          buildXMLString('stop', {
            offset: (stop.offset ?? 0) * 100 + '%',
            'stop-color': stop.color,
          })
        )
        .join('')
    ) +
      buildXMLString('rect', {
        x: 0,
        y: 0,
        width: imageWidth,
        height: imageHeight,
        fill: `url(#${gradientId})`,
      })
  )
  return [patternId, defs]
}

function resolveXYFromDirection(dir: string) {
  let x1 = 0,
    y1 = 0,
    x2 = 0,
    y2 = 0

  if (dir.includes('top')) {
    y1 = 1
  } else if (dir.includes('bottom')) {
    y2 = 1
  }

  if (dir.includes('left')) {
    x1 = 1
  } else if (dir.includes('right')) {
    x2 = 1
  }

  if (!x1 && !x2 && !y1 && !y2) {
    y1 = 1
  }

  return [x1, y1, x2, y2]
}
