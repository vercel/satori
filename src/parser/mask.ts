import { getPropertyName } from 'css-to-react-native'

function getMaskProperty(style: Record<string, string | number>, name: string) {
  const key = getPropertyName(`mask-${name}`)
  return (style[key] || style[`WebkitM${key.substring(1)}`]) as string
}

export interface MaskProperty {
  image: string
  position: string
  size: string
  repeat: string
  origin: string
  clip: string
}

/**
 * url(https:a.png), linear-gradient(blue, red) => [url(https:a.png), linear-gradient(blue, red)]
 * rgba(0,0,0,.7) => [rgba(0,0,0,.7)]
 */
const SPILIT_SOURCE_COMMOA_RE = /(?<=\))(?:\s*,\s*)/

export function parseMask(
  style: Record<string, string | number>
): MaskProperty[] {
  const maskImage = (style.maskImage || style.WebkitMaskImage) as string

  const common = {
    position: getMaskProperty(style, 'position') || '0% 0%',
    size: getMaskProperty(style, 'size') || '100% 100%',
    repeat: getMaskProperty(style, 'repeat') || 'repeat',
    origin: getMaskProperty(style, 'origin') || 'border-box',
    clip: getMaskProperty(style, 'origin') || 'border-box',
  }

  return (
    maskImage
      .split(SPILIT_SOURCE_COMMOA_RE)
      // https://www.w3.org/TR/css-backgrounds-3/#layering
      .reverse()
      .map((v) => v.trim())
      .filter((v) => v && v !== 'none')
      .map((m) => ({
        image: m,
        ...common,
      }))
  )
}
