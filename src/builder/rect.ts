import radius from './radius'

export default function rect(
  {
    left,
    top,
    width,
    height,
  }: {
    id: number
    left: number
    top: number
    width: number
    height: number
  },
  style: Record<string, number | string>
) {
  let type = 'rect'
  let fill = 'transparent'
  let stroke = 'transparent'

  if (style.backgroundColor) {
    fill = style.backgroundColor as string
  }

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )

  if (path) {
    type = 'path'
  }

  return `<${type} x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" ${
    path ? `d="${path}"` : ''
  }></${type}>`
}
