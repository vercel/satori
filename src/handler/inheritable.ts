import { SerializedStyle } from './expand.js'

const list = new Set([
  'color',
  'font',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'textAlign',
  'textTransform',
  'textShadowOffset',
  'textShadowColor',
  'textShadowRadius',
  'WebkitTextStrokeWidth',
  'WebkitTextStrokeColor',
  'textDecorationLine',
  'textDecorationStyle',
  'textDecorationColor',
  'textDecorationSkipInk',
  'whiteSpace',
  'transform',
  'wordBreak',
  'tabSize',

  // Special case: SVG doesn't apply these to children elements so we need to
  // make it inheritable here.
  'opacity',
  'filter',

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
    if (list.has(prop)) {
      inheritedStyle[prop] = style[prop]
    }
  }
  return inheritedStyle
}
