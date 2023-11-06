import { getPropertyName } from 'css-to-react-native'
import { splitEffects } from '../utils.js'

function getMaskProperty(style: Record<string, string | number>, name: string) {
  const key = getPropertyName(`mask-${name}`)
  return (
    (style[key] || style[`WebkitM${key.substring(1)}`] || '') as string
  ).split(',')
}

export interface MaskProperty {
  image: string
  position: string
  size: string
  repeat: string
  origin: string
  clip: string
  mode: string
}

export interface MaskParsedRes {
  type: string
  detail: MaskProperty[]
}

export function parseMask(
  style: Record<string, string | number>
): MaskParsedRes {
  const maskImage = (style.maskImage || style.WebkitMaskImage) as string

  const common = {
    position: getMaskProperty(style, 'position'),
    size: getMaskProperty(style, 'size'),
    repeat: getMaskProperty(style, 'repeat'),
    origin: getMaskProperty(style, 'origin'),
    clip: getMaskProperty(style, 'origin'),
    mode: getMaskProperty(style, 'mode'),
  }

  const images = splitEffects(maskImage).filter((v) => v && v !== 'none')

  const result = []

  for (let i = 0, n = images.length; i < n; i++) {
    result[i] = {
      image: images[i],
      position: common.position[i] || '0% 0%',
      size: common.size[i] || '',
      repeat: common.repeat[i] || 'repeat',
      origin: common.origin[i] || 'border-box',
      clip: common.clip[i] || 'border-box',
      // https://drafts.fxtf.org/css-masking/#the-mask-mode
      // match-source(default), alpha, luminance
      // image -> alpha:
      // 1. url()
      // 2.gradient
      // mask-source -> luminance(e.g url(mask#id))
      // we do rarely use mask-source in satori, so here we just set alpha by default
      mode: common.mode[i] || 'alpha',
    }
  }

  return {
    type: (getMaskProperty(style, 'type')[0] || 'alpha') as string,
    detail: result,
  }
}
