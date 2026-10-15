import { SerializedStyle } from './expand.js'
import { getLonghands } from './shorthands.js'

const list = new Set([
  'color',
  'font',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'fontFeatureSettings',
  'fontSynthesis',
  'fontSynthesisWeight',
  'fontSynthesisStyle',
  'fontKerning',
  'fontVariantLigatures',
  'fontVariantCaps',
  'fontVariantNumeric',
  'fontVariantEastAsian',
  'fontVariantPosition',
  'fontVariantAlternates',
  'letterSpacing',
  'wordSpacing',
  'listStyleType',
  'listStylePosition',
  'listStyleImage',
  'lineHeight',
  'textAlign',
  'textIndent',
  'textTransform',
  'textShadowOffset',
  'textShadowColor',
  'textShadowRadius',
  'WebkitTextStrokeWidth',
  'WebkitTextStrokeColor',
  'WebkitTextFillColor',
  'paintOrder',
  'textDecorationLine',
  'textDecorationStyle',
  'textDecorationColor',
  'textDecorationSkipInk',
  'textDecorationThickness',
  'textUnderlineOffset',
  'whiteSpace',
  'textWrap',
  'transform',
  'wordBreak',
  'overflowWrap',
  'tabSize',
  'visibility',
  'direction',

  // Special properties of Satori:
  '_viewportWidth',
  '_viewportHeight',
  '_chRatio',
  '_inheritedClipPathId',
  '_inheritedMaskId',
  '_inheritedBackgroundClipTextPath',
  '_inheritedBackgroundClipTextHasBackground',
])

/**
 * Whether a property, or the longhands of a shorthand, are inherited. Satori
 * passes `transform` down for its own use, but it isn't inherited.
 */
export function isInherited(prop: string) {
  if (prop === 'transform') return false
  if (list.has(prop)) return true
  for (const longhand of getLonghands(prop)) {
    if (list.has(longhand)) return true
  }
  return false
}

export default function inheritable(style: SerializedStyle): SerializedStyle {
  const inheritedStyle: SerializedStyle = {}
  for (const prop in style) {
    // CSS custom properties (--*) always inherit
    if (list.has(prop) || prop.startsWith('--')) {
      inheritedStyle[prop] = style[prop]
    }
  }
  return inheritedStyle
}
