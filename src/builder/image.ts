export function getPreserveAspectRatio(
  objectFit: string,
  objectPosition?: string
) {
  if (objectFit !== 'contain' && objectFit !== 'cover') {
    return 'none'
  }

  let align = 'xMidYMid'

  if (objectPosition) {
    const parts = objectPosition.split(' ')

    if (parts.length === 2) {
      const [x, y] = parts

      if (x === 'left') {
        align = 'xMin'
      } else if (x === 'right') {
        align = 'xMax'
      } else {
        align = 'XMid'
      }

      if (y === 'top') {
        align += 'YMin'
      } else if (y === 'bottom') {
        align += 'YMax'
      } else {
        align += 'YMid'
      }
    }
  }

  return align + (objectFit === 'cover' ? ' slice' : '')
}
