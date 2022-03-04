const list = new Set([
  'color',
  'font',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'lineHeight',
  'textAlign',
  'textTransform',
  'whiteSpace',
  'letterSpacing',
  'transform',
  'wordBreak',
  'textShadowOffset',
  'textShadowColor',
  'textShadowRadius',

  // Special case: SVG doesn't apply opacity to children elements so we need to
  // make it inheritable here.
  'opacity',

  // Special properties of Satori:
  '_viewportWidth',
  '_viewportHeight',
  '_inheritedClipPathId',
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
