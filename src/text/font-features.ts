/**
 * The OpenType features of `fontKerning` and the `fontVariant` longhands.
 *
 * @see https://www.w3.org/TR/css-fonts-4/#font-feature-resolution
 */
import type { SerializedStyle } from '../handler/expand.js'

/** The features of each keyword of the `fontVariant` longhands. */
const VARIANT_FEATURES: Record<string, Record<string, string>> = {
  fontVariantLigatures: {
    none: '"liga" 0, "clig" 0, "dlig" 0, "hlig" 0, "calt" 0',
    'common-ligatures': '"liga" 1, "clig" 1',
    'no-common-ligatures': '"liga" 0, "clig" 0',
    'discretionary-ligatures': '"dlig" 1',
    'no-discretionary-ligatures': '"dlig" 0',
    'historical-ligatures': '"hlig" 1',
    'no-historical-ligatures': '"hlig" 0',
    contextual: '"calt" 1',
    'no-contextual': '"calt" 0',
  },
  fontVariantCaps: {
    'small-caps': '"smcp"',
    'all-small-caps': '"c2sc", "smcp"',
    'petite-caps': '"pcap"',
    'all-petite-caps': '"c2pc", "pcap"',
    unicase: '"unic"',
    'titling-caps': '"titl"',
  },
  fontVariantNumeric: {
    'lining-nums': '"lnum"',
    'oldstyle-nums': '"onum"',
    'proportional-nums': '"pnum"',
    'tabular-nums': '"tnum"',
    'diagonal-fractions': '"frac"',
    'stacked-fractions': '"afrc"',
    ordinal: '"ordn"',
    'slashed-zero': '"zero"',
  },
  fontVariantEastAsian: {
    jis78: '"jp78"',
    jis83: '"jp83"',
    jis90: '"jp90"',
    jis04: '"jp04"',
    simplified: '"smpl"',
    traditional: '"trad"',
    'full-width': '"fwid"',
    'proportional-width': '"pwid"',
    ruby: '"ruby"',
  },
  fontVariantPosition: {
    sub: '"subs"',
    super: '"sups"',
  },
  fontVariantAlternates: {
    'historical-forms': '"hist"',
  },
  // Valid, but without features, since the presentation of emoji isn't
  // chosen.
  fontVariantEmoji: {
    text: '',
    emoji: '',
    unicode: '',
  },
}

/** Whether a property is `fontKerning` or a `fontVariant` longhand. */
export function isFontVariantProperty(name: string) {
  return name === 'fontKerning' || name in VARIANT_FEATURES
}

/** Keywords that can't be combined with others in each longhand. */
const EXCLUSIVE = new Set(['normal', 'none'])

/**
 * Validates a `fontVariant` longhand, or `fontKerning`, and returns its
 * keywords, lowercased.
 */
export function parseFontVariant(name: string, value: unknown): string {
  const keywords = String(value).trim().toLowerCase().split(/\s+/)
  const valid =
    name === 'fontKerning'
      ? keywords.length === 1 &&
        ['auto', 'normal', 'none'].includes(keywords[0])
      : keywords.every(
          (keyword) =>
            (EXCLUSIVE.has(keyword) &&
              keywords.length === 1 &&
              (keyword === 'normal' || name === 'fontVariantLigatures')) ||
            keyword in VARIANT_FEATURES[name]
        )
  if (!valid) throw new Error(`Invalid \`${name}\` value.`)
  return keywords.join(' ')
}

/**
 * Splits the `fontVariant` shorthand into its longhands, which it resets.
 */
export function expandFontVariant(value: unknown): Record<string, string> {
  const keywords = String(value).trim().toLowerCase().split(/\s+/)
  const longhands: Record<string, string[]> = {}
  for (const name in VARIANT_FEATURES) longhands[name] = []
  if (keywords.length === 1 && EXCLUSIVE.has(keywords[0])) {
    if (keywords[0] === 'none') longhands.fontVariantLigatures.push('none')
  } else {
    for (const keyword of keywords) {
      const name = Object.keys(VARIANT_FEATURES).find(
        (longhand) => keyword in VARIANT_FEATURES[longhand]
      )
      if (!name) throw new Error('Invalid `fontVariant` value.')
      longhands[name].push(keyword)
    }
  }
  const result: Record<string, string> = {}
  for (const name in longhands) {
    result[name] = longhands[name].join(' ') || 'normal'
  }
  return result
}

/**
 * The features of `fontKerning` and the `fontVariant` longhands, followed by
 * `fontFeatureSettings`, which takes precedence, as a `fontFeatureSettings`
 * value.
 */
export function getFontFeatureSettings(
  style: SerializedStyle
): string | undefined {
  const features: string[] = []
  if (style.fontKerning === 'none') features.push('"kern" 0')
  for (const name in VARIANT_FEATURES) {
    const value = style[name] as string | undefined
    if (!value) continue
    for (const keyword of value.split(' ')) {
      const feature = VARIANT_FEATURES[name][keyword]
      if (feature) features.push(feature)
    }
  }
  const settings = style.fontFeatureSettings as string | undefined
  if (settings && settings !== 'normal') features.push(settings)
  return features.length ? features.join(', ') : undefined
}
