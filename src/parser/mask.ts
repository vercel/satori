import { getPropertyName } from 'css-to-react-native'

function getMaskProperty(style: Record<string, string | number>, name: string) {
  const key = getPropertyName(`mask-${name}`)
  return (style[key] || style[`-webkit${key.toUpperCase()}`]) as string
}

export interface MaskProperty {
  image: string
  position: string
  size: string
  repeat: string
  origin: string
  clip: string
}

export function parseMask(style: Record<string, string | number>) {
  const masks: MaskProperty[] = []

  masks.push({
    image: getMaskProperty(style, 'image') || 'none',
    position: getMaskProperty(style, 'position') || '0% 0%',
    size: getMaskProperty(style, 'size') || '100% 100%',
    repeat: getMaskProperty(style, 'repeat') || 'repeat',
    origin: getMaskProperty(style, 'origin') || 'border-box',
    clip: getMaskProperty(style, 'origin') || 'border-box',
  })

  return masks
}
