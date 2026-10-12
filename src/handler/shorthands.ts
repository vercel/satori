/**
 * The longhands of shorthand properties, in the camel case of inline styles.
 * Shorthands of shorthands, e.g. `border`, list both. Properties with the
 * same prefix aren't always longhands, e.g. `flexDirection` isn't one of
 * `flex`, and `borderRadius` isn't one of `border`.
 */

const SIDES = ['Top', 'Right', 'Bottom', 'Left']
const sides = (prefix: string, suffix = '') =>
  SIDES.map((side) => prefix + side + suffix)

const LONGHANDS: Record<string, string[]> = {
  margin: sides('margin'),
  padding: sides('padding'),
  inset: ['top', 'right', 'bottom', 'left'],
  border: [
    'borderWidth',
    'borderStyle',
    'borderColor',
    ...sides('border'),
    'borderImage',
  ],
  borderWidth: sides('border', 'Width'),
  borderStyle: sides('border', 'Style'),
  borderColor: sides('border', 'Color'),
  ...Object.fromEntries(
    SIDES.map((side) => [
      'border' + side,
      ['Width', 'Style', 'Color'].map((part) => 'border' + side + part),
    ])
  ),
  borderRadius: [
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomRightRadius',
    'borderBottomLeftRadius',
  ],
  borderImage: [
    'borderImageSource',
    'borderImageSlice',
    'borderImageWidth',
    'borderImageOutset',
    'borderImageRepeat',
  ],
  outline: ['outlineColor', 'outlineStyle', 'outlineWidth'],
  background: [
    'backgroundColor',
    'backgroundImage',
    'backgroundPosition',
    'backgroundSize',
    'backgroundRepeat',
    'backgroundOrigin',
    'backgroundClip',
    'backgroundAttachment',
  ],
  backgroundPosition: ['backgroundPositionX', 'backgroundPositionY'],
  font: [
    'fontStyle',
    'fontVariant',
    'fontWeight',
    'fontStretch',
    'fontSize',
    'lineHeight',
    'fontFamily',
    'fontKerning',
    'fontSizeAdjust',
  ],
  fontVariant: [
    'fontVariantCaps',
    'fontVariantNumeric',
    'fontVariantLigatures',
    'fontVariantEastAsian',
    'fontVariantPosition',
    'fontVariantAlternates',
    'fontVariantEmoji',
  ],
  fontSynthesis: [
    'fontSynthesisWeight',
    'fontSynthesisStyle',
    'fontSynthesisSmallCaps',
    'fontSynthesisPosition',
  ],
  textDecoration: [
    'textDecorationLine',
    'textDecorationStyle',
    'textDecorationColor',
    'textDecorationThickness',
  ],
  listStyle: ['listStyleType', 'listStylePosition', 'listStyleImage'],
  flex: ['flexGrow', 'flexShrink', 'flexBasis'],
  flexFlow: ['flexDirection', 'flexWrap'],
  gap: ['rowGap', 'columnGap'],
  grid: ['gridTemplate', 'gridAutoRows', 'gridAutoColumns', 'gridAutoFlow'],
  gridTemplate: [
    'gridTemplateRows',
    'gridTemplateColumns',
    'gridTemplateAreas',
  ],
  gridArea: ['gridRow', 'gridColumn'],
  gridRow: ['gridRowStart', 'gridRowEnd'],
  gridColumn: ['gridColumnStart', 'gridColumnEnd'],
  placeContent: ['alignContent', 'justifyContent'],
  placeItems: ['alignItems', 'justifyItems'],
  placeSelf: ['alignSelf', 'justifySelf'],
  overflow: ['overflowX', 'overflowY'],
  mask: [
    'maskImage',
    'maskPosition',
    'maskSize',
    'maskRepeat',
    'maskOrigin',
    'maskClip',
    'maskComposite',
    'maskMode',
  ],
  // Satori stores these shorthands as its own longhands.
  textShadow: ['textShadowOffset', 'textShadowColor', 'textShadowRadius'],
  WebkitTextStroke: ['WebkitTextStrokeWidth', 'WebkitTextStrokeColor'],
}

const cache = new Map<string, Set<string>>()

/** The longhands of a property, recursively, if it's a shorthand. */
export function getLonghands(prop: string): Set<string> {
  let longhands = cache.get(prop)
  if (!longhands) {
    longhands = new Set()
    for (const longhand of LONGHANDS[prop] || []) {
      longhands.add(longhand)
      for (const nested of getLonghands(longhand)) longhands.add(nested)
    }
    cache.set(prop, longhands)
  }
  return longhands
}

/** Whether `key` is the property `prop` or one of its longhands. */
export function isLonghandOf(key: string, prop: string) {
  return key === prop || getLonghands(prop).has(key)
}
