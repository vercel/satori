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
  'textDecorationLine',
  'textDecorationStyle',
  'textDecorationColor',
  'whiteSpace',
  'transform',
  'wordBreak',

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
])

export default function inheritable(style: Record<string, any>) {
  const inheritedStyle: Record<string, any> = {}
  for (const prop in style) {
    if (list.has(prop)) {
      inheritedStyle[prop] = style[prop]
    }
  }
  return inheritedStyle
}
