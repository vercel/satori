export default function rect(
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
  style: Record<string, number | string>
) {
  let fill = 'transparent'
  let stroke = 'transparent'

  if (style.backgroundColor) {
    fill = style.backgroundColor as string
  }

  return `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}"></rect>`
}
