/**
 * @see https://stackoverflow.com/a/11508164
 */
function hexToRgb(hex: string): [r: number, g: number, b: number] {
  if (hex.length === 3) {
    hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  }
  const val = parseInt(hex, 16)
  const r = (val >> 16) & 255
  const g = (val >> 8) & 255
  const b = val & 255
  return [r, g, b]
}

export default function addOpacity(color: string, opacity: string) {
  if (color.startsWith('#')) {
    return `rgb(${hexToRgb(color.slice(1)).join(' ')} / ${opacity})`
  } else {
    // Assume rgb(...) or hsl(...)
    return color.replace(')', `/ ${opacity})`)
  }
}
