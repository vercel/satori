import { buildXMLString, lengthToNumber } from 'src/utils.js'
import { default as buildBorderRadius } from './border-radius.js'
import { getStylesForProperty } from 'css-to-react-native'

const regexMap = {
  circle: /circle\((.+)\)/,
  ellipse: /ellipse\((.+)\)/,
  path: /path\((.+)\)/,
  polygon: /polygon\((.+)\)/,
  inset: /inset\((.+)\)/,
}

export function genClipPath(id: string) {
  return `url(#satori_cp-${id})`
}

export function buildClipPath(
  v: {
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
  inheritedStyle: Record<string, string | number>
) {
  if (style.clipPath === 'none') return ''

  const matcher = resolveMatch(v, style, inheritedStyle)
  const clipPath = style.clipPath as string
  let res = ''

  let tmp: { type: string; [p: string]: string | number } = { type: '' }

  if (
    (tmp =
      matcher.matchCircle(clipPath) ||
      matcher.matchEllipse(clipPath) ||
      matcher.matchPath(clipPath) ||
      matcher.matchPolygon(clipPath) ||
      matcher.matchInset(clipPath))
  ) {
    const { type, ...rest } = tmp
    res = buildXMLString(
      'clipPath',
      {
        id: `satori_cp-${v.id}`,
      },
      buildXMLString(type, rest)
    )
  }
  return res
}

function resolveMatch(
  {
    left,
    top,
    width,
    height,
  }: {
    left: number
    top: number
    width: number
    height: number
  },
  style: Record<string, string | number>,
  inheritedStyle: Record<string, string | number>
) {
  function matchCircle(str: string) {
    const res = str.match(regexMap['circle'])

    if (!res) return null

    const [, value] = res
    const [radius, pos = ''] = value.split('at').map((v) => v.trim())
    const { x, y } = resolvePosition(pos, width, height)

    return {
      type: 'circle',
      r: lengthToNumber(
        radius,
        inheritedStyle.fontSize as number,
        width,
        inheritedStyle,
        true
      ),
      cx: lengthToNumber(
        x,
        inheritedStyle.fontSize as number,
        width,
        inheritedStyle,
        true
      ),
      cy: lengthToNumber(
        y,
        inheritedStyle.fontSize as number,
        height,
        inheritedStyle,
        true
      ),
    }
  }
  function matchEllipse(str: string) {
    const res = str.match(regexMap['ellipse'])

    if (!res) return null

    const [, value] = res
    const [radius, pos = ''] = value.split('at').map((v) => v.trim())
    const [rx, ry] = radius.split(' ')
    const { x, y } = resolvePosition(pos, width, height)

    return {
      type: 'ellipse',
      rx: lengthToNumber(
        rx || '50%',
        inheritedStyle.fontSize as number,
        width,
        inheritedStyle,
        true
      ),
      ry: lengthToNumber(
        ry || '50%',
        inheritedStyle.fontSize as number,
        height,
        inheritedStyle,
        true
      ),
      cx: lengthToNumber(
        x,
        inheritedStyle.fontSize as number,
        width,
        inheritedStyle,
        true
      ),
      cy: lengthToNumber(
        y,
        inheritedStyle.fontSize as number,
        height,
        inheritedStyle,
        true
      ),
    }
  }
  function matchPath(str: string) {
    const res = str.match(regexMap['path'])

    if (!res) return null

    const [, fillRule = 'nonzero', d] = res[1]
      .replace(/('|")/g, '')
      .match(/^(nonzero|evenodd)?,?(.+)/)

    return {
      type: 'path',
      d,
      'fill-rule': fillRule,
    }
  }
  function matchPolygon(str: string) {
    const res = str.match(regexMap['polygon'])

    if (!res) return null

    const [, fillRule = 'nonzero', points] = res[1]
      .replace(/('|")/g, '')
      .match(/^(nonzero|evenodd)?,?(.+)/)

    return {
      type: 'polygon',
      'fill-rule': fillRule,
      points: points
        .split(',')
        .map((v) =>
          v
            .split(' ')
            .map((k, i) =>
              lengthToNumber(
                k,
                inheritedStyle.fontSize as number,
                i === 0 ? width : height,
                inheritedStyle,
                true
              )
            )
            .join(' ')
        )
        .join(','),
    }
  }
  function matchInset(str: string) {
    const res = str.match(regexMap['inset'])

    if (!res) return null

    const [inset, radius] = (
      res[1].includes('round') ? res[1] : `${res[1].trim()} round 0`
    ).split('round')
    const radiusMap = getStylesForProperty('borderRadius', radius, true)
    const r = Object.values(radiusMap)
      .map((s) => String(s))
      .map((s, i) =>
        lengthToNumber(
          s,
          inheritedStyle.fontSize as number,
          i === 0 || i === 2 ? height : width,
          inheritedStyle,
          true
        )
      )
    const offsets = Object.values(getStylesForProperty('margin', inset, true))
      .map((s) => String(s))
      .map((s, i) =>
        lengthToNumber(
          s,
          inheritedStyle.fontSize as number,
          i === 0 || i === 2 ? height : width,
          inheritedStyle,
          true
        )
      )
    const x = offsets[3]
    const y = offsets[0]
    const w = width - (offsets[1] + offsets[3])
    const h = height - (offsets[0] + offsets[2])

    if (r.some((v) => v > 0)) {
      const d = buildBorderRadius(
        { left: x, top: y, width: w, height: h },
        { ...style, ...radiusMap }
      )

      return { type: 'path', d }
    }

    return {
      type: 'rect',
      x,
      y,
      width: w,
      height: h,
    }
  }

  return {
    matchCircle,
    matchEllipse,
    matchPath,
    matchPolygon,
    matchInset,
  }
}

function resolvePosition(position: string, xDelta: number, yDelta: number) {
  const pos = position.split(' ')
  const res: { x: number | string; y: number | string } = {
    x: pos[0] || '50%',
    y: pos[1] || '50%',
  }

  pos.forEach((v) => {
    if (v === 'top') {
      res.y = 0
    } else if (v === 'bottom') {
      res.y = yDelta
    } else if (v === 'left') {
      res.x = 0
    } else if (v === 'right') {
      res.x = xDelta
    } else {
      res.x = xDelta / 2
      res.y = yDelta / 2
    }
  })

  return res
}
