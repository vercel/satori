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

function splitMaskImages(maskImage) {
  let maskImages = []
  let start = 0
  let parenCount = 0

  for (let i = 0; i < maskImage.length; i++) {
    if (maskImage[i] === '(') {
      parenCount++
    } else if (maskImage[i] === ')') {
      parenCount--
    }

    if (parenCount === 0 && maskImage[i] === ',') {
      maskImages.push(maskImage.slice(start, i).trim())
      start = i + 1
    }
  }

  maskImages.push(maskImage.slice(start).trim())

  return maskImages
}

/**
 * url(https:a.png), linear-gradient(blue, red) => [url(https:a.png), linear-gradient(blue, red)]
 * rgba(0,0,0,.7) => [rgba(0,0,0,.7)]
 */

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

  let maskImages = splitMaskImages(maskImage).filter((v) => v && v !== 'none')

  return maskImages.reverse().map((m) => ({
    image: m,
    ...common,
  }))
}
