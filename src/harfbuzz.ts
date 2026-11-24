/**
 * HarfBuzz wrapper module for advanced text shaping with OpenType features.
 * This module provides text shaping capabilities while maintaining compatibility
 * with the existing opentype.js-based system.
 */

import opentype from '@shuding/opentype.js'
import type * as HarfBuzz from 'harfbuzzjs'

let hb: typeof HarfBuzz | null = null
let initPromise: Promise<void> | null = null

/**
 * Shape result from HarfBuzz containing glyph IDs and positions
 */
export interface ShapedGlyph {
  g: number // glyph ID
  cl: number // cluster (character index)
  ax: number // advance x
  ay: number // advance y
  dx: number // offset x
  dy: number // offset y
}

/**
 * Font features configuration
 * Maps feature tags to boolean or numeric values
 * Examples: { liga: true, kern: true, smcp: 1 }
 */
export interface FontFeatures {
  [feature: string]: boolean | number
}

/**
 * Internal cache for HarfBuzz font objects
 */
const hbFontCache = new WeakMap<opentype.Font, HarfBuzz.Font>()

/**
 * Initialize HarfBuzz WASM module
 * Must be called before using any shaping functions
 */
export async function initHarfBuzz(): Promise<void> {
  // If already initialized, return immediately
  if (hb) return

  // If initialization is in progress, wait for it
  if (initPromise) {
    await initPromise
    return
  }

  // Start initialization
  // harfbuzzjs is ESM-only and initializes itself with a top-level await, so
  // it can't be `require`d from the CJS build. `import()` works from both.
  initPromise = (async () => {
    hb = await import('harfbuzzjs')
  })()

  await initPromise
}

/**
 * Create or get cached HarfBuzz font from opentype.js font
 */
function getHarfBuzzFont(font: opentype.Font): HarfBuzz.Font {
  if (!hb) {
    throw new Error('HarfBuzz not initialized. Call initHarfBuzz() first.')
  }

  // Check cache first
  if (hbFontCache.has(font)) {
    const cached = hbFontCache.get(font)
    return cached
  }

  // Get the raw font data (already converted from WOFF if needed in font.ts)
  const arrayBuffer = (font as any)._rawFontData

  if (!arrayBuffer) {
    throw new Error(
      'Font does not have _rawFontData. Make sure to store the original ' +
        'ArrayBuffer when loading fonts.'
    )
  }

  // harfbuzzjs frees these when their JS objects are collected. The native font
  // references the face, which references the blob, so only the font needs to
  // stay reachable, and it lives as long as the opentype.js font in the cache.
  const hbFont = new hb.Font(new hb.Face(new hb.Blob(arrayBuffer), 0))

  // Set scale to unitsPerEm so advances are returned in font design units.
  // The caller scales by (fontSize / unitsPerEm) to convert to pixels.
  const upem = font.unitsPerEm
  hbFont.setScale(upem, upem)

  // Cache the HarfBuzz font
  hbFontCache.set(font, hbFont)

  return hbFont
}

/**
 * Shape text using HarfBuzz with optional OpenType features
 *
 * @param font - opentype.js font object
 * @param text - text to shape
 * @param features - optional OpenType features to apply
 * @param language - optional language code (e.g., 'en', 'ar')
 * @param script - optional script code (e.g., 'latn', 'arab')
 * @param direction - text direction ('ltr', 'rtl', 'ttb', 'btt')
 * @returns Array of shaped glyphs with IDs and positions
 */
export function shapeText(
  font: opentype.Font,
  text: string,
  options: {
    features?: FontFeatures
    language?: string
    script?: string
    direction?: 'ltr' | 'rtl' | 'ttb' | 'btt'
  } = {}
): ShapedGlyph[] {
  if (!hb) {
    throw new Error('HarfBuzz not initialized')
  }

  // Handle empty string
  if (!text || text.length === 0) {
    return []
  }

  const { features, language, script, direction } = options

  // Get or create HarfBuzz font
  const hbFont = getHarfBuzzFont(font)

  const buffer = new hb.Buffer()
  buffer.addText(text)

  // Always call guessSegmentProperties() first to detect script, language,
  // and direction from the text content. This is essential for complex
  // scripts like Arabic, Devanagari, Thai, Tamil, etc.
  buffer.guessSegmentProperties()

  // Override with explicitly provided values if any
  if (language) buffer.setLanguage(language)
  if (script) buffer.setScript(script)
  if (direction) {
    const key = direction.toUpperCase() as Uppercase<typeof direction>
    buffer.setDirection(hb.Direction[key])
  }

  const hbFeatures = features
    ? Object.entries(features).map(
        ([tag, value]) => new hb.Feature(tag, Number(value))
      )
    : undefined
  hb.shape(hbFont, buffer, hbFeatures)

  const infos = buffer.getGlyphInfos()
  const positions = buffer.getGlyphPositions()
  return infos.map((info, i) => ({
    g: info.codepoint,
    cl: info.cluster,
    ax: positions[i].xAdvance,
    ay: positions[i].yAdvance,
    dx: positions[i].xOffset,
    dy: positions[i].yOffset,
  }))
}

/**
 * Parse font-feature-settings CSS property value
 * Examples:
 *   "liga" off -> { liga: false }
 *   "smcp" on -> { smcp: true }
 *   "smcp" -> { smcp: true }
 *   "c2sc", "smcp" -> { c2sc: true, smcp: true }
 */
export function parseFontFeatureSettings(value: string): FontFeatures {
  if (!value || value === 'normal') {
    return {}
  }

  const features: FontFeatures = {}

  // Split by comma
  const parts = value.split(',').map((s) => s.trim())

  for (const part of parts) {
    // Match: "tag" [on|off|number]
    const match = part.match(/["']([a-z0-9]{4})["']\s*(?:(on|off|[0-9]+))?/i)

    if (match) {
      const tag = match[1]
      const valueStr = match[2]

      if (!valueStr || valueStr === 'on' || valueStr === '1') {
        features[tag] = true
      } else if (valueStr === 'off' || valueStr === '0') {
        features[tag] = false
      } else {
        const num = parseInt(valueStr, 10)
        if (!isNaN(num)) {
          features[tag] = num
        }
      }
    }
  }

  return features
}
