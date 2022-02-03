import transform from './transform'

export default function text(
  {
    left,
    top,
    width,
    height,
    isInheritingTransform,
    path,
    debug,
  }: {
    id: number
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    path: string
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
    extra = `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="transparent" stroke="#575eff" stroke-width="1" ${
      matrix ? `transform="${matrix}"` : ''
    }></rect>`
  }

  return `<path fill="${style.color}" ${
    matrix ? `transform="${matrix}"` : ''
  } ${opacity !== 1 ? `opacity="${opacity}"` : ''} d="${path}"></path>${extra}`
}
