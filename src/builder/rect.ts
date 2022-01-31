import backgroundImage from './background-image'
import radius from './border-radius'
import shadow from './box-shadow'
import transform from './transform'

export default function rect(
  {
    id,
    left,
    top,
    width,
    height,
    isInheritingTransform,
  }: {
    id: number
    left: number
    top: number
    width: number
    height: number
    isInheritingTransform: boolean
  },
  style: Record<string, number | string>
) {
  if (style.display === 'none') return ''

  let type = 'rect'
  let stroke = 'transparent'
  let strokeWidth = 0
  let matrix = ''
  let defs = ''
  let fills: string[] = []

  if (style.backgroundColor) {
    fills.push(style.backgroundColor as string)
  }

  if (style.borderWidth) {
    strokeWidth = style.borderWidth as number
    stroke = style.borderColor as string
  }

  if (style.transform) {
    matrix = transform(
      { left, top, width, height },
      style.transform as unknown as number[],
      isInheritingTransform
    )
  }

  if (style.backgroundImage) {
    const backgrounds = (style.backgroundImage as any)
      .map((background, index) =>
        backgroundImage({ id: id + '_' + index, width, height }, background)
      )
      .filter(Boolean)
    for (const background of backgrounds) {
      defs += background[1]
      fills.push(`url(#${background[0]})`)
    }
  }

  const path = radius(
    { left, top, width, height },
    style as Record<string, number>
  )
  if (path) {
    type = 'path'
  }

  const filter = shadow({ width, height, id }, style)

  if (!fills.length) fills.push('transparent')

  return `${defs ? `<defs>${defs}</defs>` : ''}${
    filter ? `${filter}<g filter="url(#satori_s-${id})">` : ''
  }${
    // Each background generates a new rectangle.
    fills
      .map((fill, i) => {
        if (fill === 'transparent' && !(i === fills.length - 1 && strokeWidth))
          return ''

        return `<${type} x="${left}" y="${top}" width="${width}" height="${height}" fill="${fill}" ${
          i === fills.length - 1 && strokeWidth
            ? `stroke="${stroke}" stroke-width="${strokeWidth}"`
            : ''
        } ${path ? `d="${path}"` : ''} ${
          matrix ? `transform="${matrix}"` : ''
        }></${type}>`
      })
      .join('')
  }${filter ? '</g>' : ''}`
}
