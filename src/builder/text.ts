import transform from './transform'

export default function text(
  {
    left,
    top,
    width,
    height,
    isInheritingTransform,
    path,
  }: {
    id: number
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
    path: string
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

  return `<path fill="${style.color}" ${
    matrix ? `transform="${matrix}"` : ''
  } ${opacity !== 1 ? `opacity="${opacity}"` : ''} d="${path}"></path>`
}
