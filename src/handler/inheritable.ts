import { SerializedStyle } from './expand.js'

const list = new Set([
  'color',
  'font',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'fontFeatureSettings',
  'letterSpacing',
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
  'tabSize',
  'visibility',

  // Special properties of Satori:
  '_viewportWidth',
  '_viewportHeight',
  '_inheritedClipPathId',
  '_inheritedMaskId',
  '_inheritedBackgroundClipTextPath',
  '_inheritedBackgroundClipTextHasBackground',
])

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
