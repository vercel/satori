import radius from './border-radius'
import shadow from './box-shadow'

export default function rect(
  {
    id,
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
  if (style.display === 'none') return ''

  let type = 'rect'
  let fill = 'transparent'
  let stroke = 'transparent'
  let strokeWidth = 0

  if (style.backgroundColor) {
    fill = style.backgroundColor as string
  }

  if (style.borderWidth) {
    strokeWidth = style.borderWidth as number
    stroke = style.borderColor as string
  }

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )
  if (path) {
    type = 'path'
  }

  const filter = shadow({ width, height, id }, style)

  return `${filter}${
    filter ? `<g filter="url(#satori_s-${id})">` : ''
  }<${type} x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}" ${
    strokeWidth ? `stroke="${stroke}" stroke-width="${strokeWidth}"` : ''
  } ${path ? `d="${path}"` : ''}></${type}>${filter ? '</g>' : ''}`
}
