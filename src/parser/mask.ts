import { getPropertyName } from 'css-to-react-native'
import { splitEffects } from '../utils.js'

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

  let maskImages = splitEffects(maskImage).filter((v) => v && v !== 'none')

  return maskImages.reverse().map((m) => ({
    image: m,
    ...common,
  }))
}
