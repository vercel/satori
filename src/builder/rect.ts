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

  return `<${type} x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}" ${
    strokeWidth ? `stroke="${stroke}" stroke-width="${strokeWidth}"` : ''
  } ${path ? `d="${path}"` : ''}></${type}>`
}
