import radius from './radius'

export default function image(
  {
    id,
    left,
    top,
    width,
    height,
    src,
  }: {
    id: number
    left: number
    top: number
    width: number
    height: number
    src: string
  },
  style: Record<string, number | string>
) {
  let fill = 'transparent'
  let stroke = 'transparent'
  let clip = ''

  if (style.backgroundColor) {
    fill = style.backgroundColor as string
  }

  const preserveAspectRatio =
    style.objectFit === 'contain'
      ? 'xMidYMid'
      : style.objectFit === 'cover'
      ? 'xMidYMid slice'
      : 'none'

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )

  if (path) {
    clip = `<clipPath id="satori_c-${id}"><path x="${left}" y="${top}" width="${width}" height="${height}" d="${path}"></path></clipPath>`
  }

  return `${clip}<image href="${src}" x="${left}" y="${top}" width="${width}" height="${height}" preserveAspectRatio="${preserveAspectRatio}" ${
    clip ? `clip-path="url(#satori_c-${id})"` : ''
  }></image>`
}
