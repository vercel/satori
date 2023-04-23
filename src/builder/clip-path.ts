import { buildXMLString, lengthToNumber } from 'src/utils.js'

const regexMap = {
  circle: /circle\((.+)\)/,
  ellipse: /ellipse\((.+)\)/,
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

  if ((tmp = matcher.matchCircle(clipPath) || matcher.matchEllipse(clipPath))) {
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
  style: Record<string, string | number>,
  inheritedStyle: Record<string, string | number>
) {
  function matchCircle(str: string) {
    const res = str.match(regexMap['circle'])

    if (!res) return null

    const [, value] = res
    const [radius, pos = ''] = value.split('at').map((v) => v.trim())
    const [xPos, yPos = '50%'] = pos.split(' ')

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
        xPos || '50%',
        inheritedStyle.fontSize as number,
        width,
        inheritedStyle,
        true
      ),
      cy: lengthToNumber(
        yPos || '50%',
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
    const [cx, cy = '50%'] = pos.split(' ')

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
        cx || '50%',
        inheritedStyle.fontSize as number,
        width,
        inheritedStyle,
        true
      ),
      cy: lengthToNumber(
        cy || '50%',
        inheritedStyle.fontSize as number,
        height,
        inheritedStyle,
        true
      ),
    }
  }

  return {
    matchCircle,
    matchEllipse,
  }
}
