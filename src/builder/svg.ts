export default function svg(
  {
    width,
    height,
    content,
  }: {
    width: number
    height: number
    content: string
  },
  style?: Record<string, number | string>
) {
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${content}</svg>`
}
