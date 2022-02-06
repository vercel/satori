import radius from './border-radius'
import shadow from './shadow'

export default function image(
  {
    id,
    left,
    top,
    width,
    height,
    src,
    debug,
  }: {
    id: number
    left: number
    top: number
    width: number
    height: number
    src: string
    isInheritingTransform: boolean
    debug?: boolean
  },
  style: Record<string, number | string>
) {
  if (style.display === 'none') return ''

  let clip = ''
  let opacity = 1

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

  if (style.opacity) {
    opacity = +style.opacity
  }

  const filter = shadow({ width, height, id }, style)

  return `${filter}${
    filter ? `<g filter="url(#satori_s-${id})">` : ''
  }${clip}<image href="${src}" x="${left}" y="${top}" width="${width}" height="${height}" preserveAspectRatio="${preserveAspectRatio}" ${
    clip ? `clip-path="url(#satori_c-${id})"` : ''
  } ${opacity !== 1 ? `opacity="${opacity}"` : ''}></image>${
    filter ? '</g>' : ''
  }`
}
