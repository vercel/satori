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
  return `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="transparent"></rect>`
}
