import transform from './transform'

export default function text(
  {
    content,
    left,
    top,
    width,
    height,
    isInheritingTransform,
    path,
    debug,
  }: {
    content: string
    id: number
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    path: string | null
    debug?: boolean
  },
  style: Record<string, number | string>
) {
  let matrix = ''
  let opacity = 1
  let extra = ''

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

  if (debug) {
    extra = `<rect x="${left}" y="${top}" width="${width}" height="${
      path === null ? 0.5 : height
    }" fill="transparent" stroke="#575eff" stroke-width="1" ${
      matrix ? `transform="${matrix}"` : ''
    }></rect>`
  }

  // Do not embed the font, use <text> with the raw content instead.
  if (path === null) {
    return `<text x="${left}" y="${top}" width="${width}" height="${height}" fill="${
      style.color
    }" font-weight="${style.fontWeight}" font-style="${
      style.fontStyle
    }" font-size="${style.fontSize}" font-family="${style.fontFamily}" ${
      style.letterSpacing ? `letter-spacing="${style.letterSpacing}"` : ''
    } ${matrix ? `transform="${matrix}"` : ''} ${
      opacity !== 1 ? `opacity="${opacity}"` : ''
    }>${content}</text>${extra}`
  }

  return `<path fill="${style.color}" ${
    matrix ? `transform="${matrix}"` : ''
  } ${opacity !== 1 ? `opacity="${opacity}"` : ''} d="${path}"></path>${extra}`
}
