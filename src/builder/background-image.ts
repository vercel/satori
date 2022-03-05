import CssDimension from 'parse-css-dimension'
import { buildXMLString } from '../utils'

import gradient from '../../deps/gradient-parser'

interface Background {
  attachment: string
  color?: string
  clip: string
  image: string
  origin: string
  position: string
  size: string
  repeat: string
}

function resolveColorFromStop(stop) {
  if (stop.type === 'literal') return stop.value
  if (stop.type === 'hex') return `#${stop.value}`
  if (stop.type === 'rgb') return `rgb(${stop.value.join(',')})`
  if (stop.type === 'rgba') return `rgba(${stop.value.join(',')})`
  return 'transparent'
}

function toAbsoluteValue(v: string | number, base: number) {
  if (typeof v === 'string' && v.endsWith('%')) {
    return (base * parseFloat(v)) / 100
  }
  return +v
}

function parseLengthPairs(
  str: string,
  {
    x,
    y,
    defaultX,
    defaultY,
  }: {
    x: number
    y: number
    defaultX: number | string
    defaultY: number | string
  }
) {
  return (
    str
      ? str
          .split(' ')
          .map((value) => {
            try {
              const parsed = new CssDimension(value)
              return parsed.type === 'length' || parsed.type === 'number'
                ? parsed.value
                : parsed.value + parsed.unit
            } catch (e) {
              return null
            }
          })
          .filter((v) => v !== null)
      : [defaultX, defaultY]
  ).map((v, index) => toAbsoluteValue(v, [x, y][index]))
}

export default function backgroundImage(
  { id, width, height }: { id: string; width: number; height: number },
  { image, size, position }: Background
): string[] {
  const dimensions = parseLengthPairs(size, {
    x: width,
    y: height,
    defaultX: width,
    defaultY: height,
  })
  const offsets = parseLengthPairs(position, {
    x: width,
    y: height,
    defaultX: 0,
    defaultY: 0,
  })

  if (image.startsWith('linear-gradient(')) {
    const parsed = gradient.parse(image)[0]

    // Calculate the direction.
    let x1, y1, x2, y2
    if (parsed.orientation.type === 'directional') {
      ;[x1, y1, x2, y2] = {
        top: [0, 1, 0, 0],
        bottom: [0, 0, 0, 1],
        left: [1, 0, 0, 0],
        right: [0, 0, 1, 0],
      }[parsed.orientation.value]
    } else if (parsed.orientation.type === 'angular') {
      const angle = (+parsed.orientation.value / 180) * Math.PI - Math.PI / 2
      const c = Math.cos(angle)
      const s = Math.sin(angle)

      x1 = 0
      y1 = 0
      x2 = c
      y2 = s
      if (x2 < 0) {
        x1 -= x2
        x2 = 0
      }
      if (y2 < 0) {
        y1 -= y2
        y2 = 0
      }
    }

    // @TODO
    const totalLength = width

    // Resolve the color stops based on the spec:
    // https://drafts.csswg.org/css-images/#color-stop-syntax
    const stops = []
    for (const stop of parsed.colorStops) {
      const color = resolveColorFromStop(stop)
      if (!stops.length) {
        // First stop, ensure it's at the start.
        stops.push({
          offset: 0,
          color,
        })

        if (typeof stop.length === 'undefined') continue
        if (stop.length.value === '0') continue
      }

      // All offsets are relative values (0-1) in SVG.
      const offset =
        typeof stop.length === 'undefined'
          ? undefined
          : stop.length.type === '%'
          ? stop.length.value / 100
          : stop.length.value / totalLength

      stops.push({
        offset,
        color,
      })
    }
    if (!stops.length) {
      stops.push({
        offset: 0,
        color: 'transparent',
      })
    }
    // Last stop, ensure it's at the end.
    const lastStop = stops[stops.length - 1]
    if (lastStop.offset !== 1) {
      if (typeof lastStop.offset === 'undefined') {
        lastStop.offset = 1
      } else {
        stops.push({
          offset: 1,
          color: lastStop.color,
        })
      }
    }

    let previousStop = 0
    let nextStop = 1
    // Evenly distribute the missing stop offsets.
    for (let i = 0; i < stops.length; i++) {
      if (typeof stops[i].offset === 'undefined') {
        // Find the next stop that has an offset.
        if (nextStop < i) nextStop = i
        while (typeof stops[nextStop].offset === 'undefined') nextStop++

        stops[i].offset =
          ((stops[nextStop].offset - stops[previousStop].offset) /
            (nextStop - previousStop)) *
            (i - previousStop) +
          stops[previousStop].offset
      } else {
        previousStop = i
      }
    }

    return [
      `satori_bi${id}`,
      `<linearGradient id="satori_bi${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
        .map(
          (stop) =>
            `<stop offset="${stop.offset * 100}%" stop-color="${stop.color}"/>`
        )
        .join('')}</linearGradient>`,
    ]
  }


  if (image.startsWith('radial-gradient(')) {
    const gradientId = `satori_radial${id}`
    const parsed = gradient.parse(image)[0]
    const orientation = parsed.orientation[0]
    let element: {
      tag: string
      props: Record<string, string | number>
    } | null = null
    if (orientation.type === 'shape') {
      if (orientation.at.type === 'position') {
        element = {
          tag: orientation.value,
          props: {
            cx: orientation.at.value.x.value,
            cy: orientation.at.value.y.value,
            fill: `url('#${gradientId}')`,
            r: 100, // TODO: what value should we use for "r"?
          }
        }
      } else {
        throw new Error('orientation.at.type not implemented: ' + orientation.at.type)
      }
    } else {
      throw new Error('orientation.type not implemented: ' + orientation.type)
    }
    // @TODO
    const totalLength = width
    // Resolve the color stops based on the spec:
    // https://drafts.csswg.org/css-images/#color-stop-syntax
    const stops = []
    for (const stop of parsed.colorStops) {
      const color = resolveColorFromStop(stop)
      if (!stops.length) {
        // First stop, ensure it's at the start.
        stops.push({
          offset: 0,
          color,
        })

        if (typeof stop.length === 'undefined') continue
        if (stop.length.value === '0') continue
      }

      // All offsets are relative values (0-1) in SVG.
      const offset =
        typeof stop.length === 'undefined'
          ? undefined
          : stop.length.type === '%'
          ? stop.length.value / 100
          : stop.length.value / totalLength

      stops.push({
        offset,
        color,
      })
    }
    if (!stops.length) {
      stops.push({
        offset: 0,
        color: 'transparent',
      })
    }
    // Last stop, ensure it's at the end.
    const lastStop = stops[stops.length - 1]
    if (lastStop.offset !== 1) {
      if (typeof lastStop.offset === 'undefined') {
        lastStop.offset = 1
      } else {
        stops.push({
          offset: 1,
          color: lastStop.color,
        })
      }
    }

    let previousStop = 0
    let nextStop = 1
    // Evenly distribute the missing stop offsets.
    for (let i = 0; i < stops.length; i++) {
      if (typeof stops[i].offset === 'undefined') {
        // Find the next stop that has an offset.
        if (nextStop < i) nextStop = i
        while (typeof stops[nextStop].offset === 'undefined') nextStop++

        stops[i].offset =
          ((stops[nextStop].offset - stops[previousStop].offset) /
            (nextStop - previousStop)) *
            (i - previousStop) +
          stops[previousStop].offset
      } else {
        previousStop = i
      }
    }

    let shapes = new Set<string>()
    if (element) {
      const [xDelta, yDelta] = dimensions
      const tag = element.tag
      let props = { ...element.props }
      for (let cx = Number(props.cx); cx <= width; cx += xDelta) {
        props.cx = cx;
        shapes.add(buildXMLString(tag, props))
      }
      props = { ...element.props }
      for (let cy = Number(props.cy); cy <= height; cy += yDelta) {
        props.cy = cy;
        shapes.add(buildXMLString(tag, props))
      }
    }

    const result = [
      gradientId,
      `<radialGradient id="${gradientId}">${stops
        .map(stop => `<stop offset="${stop.offset * 100}%" stop-color="${stop.color}"/>`)
        .join('')}</radialGradient>`,
        Array.from(shapes).join('')
    ]
    return result;
  }

  if (image.startsWith('url(')) {
    const src = image.slice(4, -1)
    return [
      `satori_bi${id}`,
      `<pattern id="satori_bi${id}" patternContentUnits="userSpaceOnUse" patternUnits="userSpaceOnUse" x="${offsets[0]}" y="${offsets[1]}" width="${dimensions[0]}" height="${dimensions[1]}"><image href="${src}" x="0" y="0" width="${dimensions[0]}" height="${dimensions[1]}"/></pattern>`,
    ]
  }
}
