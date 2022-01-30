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
  'white-space',
  'letter-spacing',
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
