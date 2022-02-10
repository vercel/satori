import transform from './transform'

export function container(
  {
    left,
    top,
    width,
    height,
    isInheritingTransform,
  }: {
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
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

  return { matrix, opacity }
}

export default function text(
  {
    id,
    content,
    filter,
    left,
    top,
    width,
    height,
    matrix,
    opacity,
    path,
    image,
    debug,
  }: {
    content: string
    filter: string
    id: number
    left: number
    top: number
    width: number
    height: number
    matrix: string
    opacity: number
    path: string | null
    image: string | null
    debug?: boolean
  },
  style: Record<string, number | string>
) {
  let extra = ''
  if (debug) {
    extra = `<rect x="${left}" y="${top}" width="${width}" height="${
      path === null ? 0.5 : height
    }" fill="transparent" stroke="#575eff" stroke-width="1" ${
      matrix ? `transform="${matrix}"` : ''
    }></rect>`
  }

  // This grapheme should be rendered as an image.
  if (image) {
    return `${
      filter ? `${filter}<g filter="url(#satori_s-${id})">` : ''
    }<image href="${image}" x="${left}" y="${top}" width="${width}" height="${height}" ${
      matrix ? `transform="${matrix}"` : ''
    } ${opacity !== 1 ? `opacity="${opacity}"` : ''}></image>${
      filter ? '</g>' : ''
    }${extra}`
  }

  // Do not embed the font, use <text> with the raw content instead.
  if (path === null) {
    return `${
      filter ? `${filter}<g filter="url(#satori_s-${id})">` : ''
    }<text x="${left}" y="${top}" width="${width}" height="${height}" fill="${
      style.color
    }" font-weight="${style.fontWeight}" font-style="${
      style.fontStyle
    }" font-size="${style.fontSize}" font-family="${style.fontFamily}" ${
      style.letterSpacing ? `letter-spacing="${style.letterSpacing}"` : ''
    } ${matrix ? `transform="${matrix}"` : ''} ${
      opacity !== 1 ? `opacity="${opacity}"` : ''
    }>${content}</text>${filter ? '</g>' : ''}${extra}`
  }

  return `${
    filter ? `${filter}<g filter="url(#satori_s-${id})">` : ''
  }<path fill="${style.color}" ${matrix ? `transform="${matrix}"` : ''} ${
    opacity !== 1 ? `opacity="${opacity}"` : ''
  } d="${path}"></path>${filter ? '</g>' : ''}${extra}`
}