export default function text(
  {
    left,
    top,
    width,
    height,
    content,
  }: {
    left: number
    top: number
    width: number
    height: number
    content: string
  },
  style: Record<string, number | string>
) {
  return `<text x="${left}" y="${top}" width="${width}" height="${height}" fill="${style.color}" font-weight="${style.fontWeight}" font-style="${style.fontStyle}" font-size="${style.fontSize}" font-family="${style.fontFamily}">${content}</text>`
}
