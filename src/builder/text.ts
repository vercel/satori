import transform from './transform'

export default function text(
  {
    left,
    top,
    width,
    height,
    content,
    isInheritingTransform,
  }: {
    id: number
    left: number
    top: number
    width: number
    height: number
    content: string
    isInheritingTransform: boolean
  },
  style: Record<string, number | string>
) {
  let matrix = ''
  let opacity = 1

  if (style.transform) {
    matrix = transform(
      { left, top, width, height },
      style.transform as unknown as number[],
      isInheritingTransform
    )
  }

  if (style.opacity) {
    opacity = +style.opacity
  }

  return `<text x="${left}" y="${
    top + height
  }" width="${width}" height="${height}" fill="${style.color}" font-weight="${
    style.fontWeight
  }" font-style="${style.fontStyle}" font-size="${
    style.fontSize
  }" font-family="${style.fontFamily}" ${
    style.letterSpacing ? `letter-spacing="${style.letterSpacing}"` : ''
  } ${matrix ? `transform="${matrix}"` : ''} ${
    opacity !== 1 ? `opacity="${opacity}"` : ''
  }>${content}</text>`
}
