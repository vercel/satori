import { SerializedStyle } from './expand.js'

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
  'transform',
  'wordBreak',
  'overflowWrap',
  'tabSize',
  'visibility',
  'direction',

  // Special properties of Satori:
  '_viewportWidth',
  '_viewportHeight',
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
  for (const inherited of list) {
    if (
      inherited === prop ||
      (inherited.startsWith(prop) && /[A-Z]/.test(inherited[prop.length]))
    ) {
      return true
    }
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
