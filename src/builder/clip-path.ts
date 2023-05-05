import { buildXMLString } from '../utils.js'
import { createShapeParser } from '../parser/shape.js'

export function genClipPathId(id: string) {
  return `satori_cp-${id}`
}
export function genClipPath(id: string) {
  return `url(#${genClipPathId(id)})`
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

  const parser = createShapeParser(v, style, inheritedStyle)
  const clipPath = style.clipPath as string

  let tmp: { type: string; [p: string]: string | number } = { type: '' }

  for (const k of Object.keys(parser)) {
    tmp = parser[k](clipPath)
    if (tmp) break
  }

  if (tmp) {
    const { type, ...rest } = tmp
    return buildXMLString(
      'clipPath',
      {
        id: genClipPathId(v.id),
        'clip-path': v.currentClipPath,
        transform: `translate(${v.left}, ${v.top})`,
      },
      buildXMLString(type, rest)
    )
  }
  return ''
}
