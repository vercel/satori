/**
 * HarfBuzz wrapper module for advanced text shaping with OpenType features.
 * This module provides text shaping capabilities while maintaining compatibility
 * with the existing opentype.js-based system.
 */

import type opentype from '@shuding/opentype.js'
import type { FontWeight, FontStyle } from './font.js'
import harfbuzzjsPromise from 'harfbuzzjs'

// HarfBuzz types (will be populated when module loads)
let hb: any = null
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
const hbFontCache = new WeakMap<opentype.Font, any>()

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
  initPromise = (async () => {
    // harfbuzzjsPromise is statically imported at the top
    // It's a Promise that resolves to the HarfBuzz instance
    hb = await harfbuzzjsPromise

    if (!hb || typeof hb.createBlob !== 'function') {
      throw new Error('HarfBuzz module loaded but API is not available')
    }
  })()

  await initPromise
}

/**
 * Check if HarfBuzz is initialized
 */
export function isHarfBuzzInitialized(): boolean {
  return hb !== null
}

/**
 * Create or get cached HarfBuzz font from opentype.js font
 */
function getHarfBuzzFont(font: opentype.Font): any {
  if (!hb) {
    throw new Error('HarfBuzz not initialized. Call initHarfBuzz() first.')
  }

  // Check cache first
  if (hbFontCache.has(font)) {
    return hbFontCache.get(font)
  }

  // Get the font data from opentype.js font
  // We need the raw font bytes to pass to HarfBuzz
  const fontData = (font as any).outlinesFormat || (font as any).tables

  if (!fontData) {
    throw new Error('Cannot extract font data from opentype.js font')
  }

  // Create HarfBuzz font
  // Note: We'll need to store the original ArrayBuffer in the font object
  // during font loading for this to work
  const arrayBuffer = (font as any)._rawFontData

  if (!arrayBuffer) {
    throw new Error(
      'Font does not have _rawFontData. Make sure to store the original ' +
        'ArrayBuffer when loading fonts.'
    )
  }

  const blob = hb.createBlob(new Uint8Array(arrayBuffer))
  const face = hb.createFace(blob, 0)
  const hbFont = hb.createFont(face)

  // Set scale to match the unitsPerEm
  hbFont.setScale(font.unitsPerEm, font.unitsPerEm)

  // Cache the HarfBuzz font
  const hbFontData = { blob, face, font: hbFont }
  hbFontCache.set(font, hbFontData)

  return hbFontData
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
  const { font: hbFont } = getHarfBuzzFont(font)

  // Create buffer
  const buffer = hb.createBuffer()

  try {
    // Add text to buffer
    buffer.addText(text)

    // Set buffer properties
    if (language) buffer.setLanguage(language)
    if (script) buffer.setScript(script)
    if (direction) buffer.setDirection(direction)
    else buffer.guessSegmentProperties()

    // Build features string if provided
    let featuresString: string | undefined
    if (features && Object.keys(features).length > 0) {
      const featureStrings: string[] = []
      for (const [tag, value] of Object.entries(features)) {
        if (typeof value === 'boolean') {
          featureStrings.push(value ? `+${tag}` : `-${tag}`)
        } else {
          featureStrings.push(`${tag}=${value}`)
        }
      }
      featuresString = featureStrings.join(',')
    }

    // Shape the text with optional features (passed as third parameter)
    if (featuresString) {
      hb.shape(hbFont, buffer, featuresString)
    } else {
      hb.shape(hbFont, buffer)
    }

    // Get shaped glyphs
    const result = buffer.json(hbFont)

    return result as ShapedGlyph[]
  } finally {
    // Clean up buffer
    buffer.destroy()
  }
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

/**
 * Cleanup HarfBuzz resources for a font
 */
export function cleanupHarfBuzzFont(font: opentype.Font): void {
  const cached = hbFontCache.get(font)
  if (cached) {
    cached.font.destroy()
    cached.face.destroy()
    cached.blob.destroy()
    hbFontCache.delete(font)
  }
}

/**
 * Get glyph advance width from shaped result
 * This accounts for kerning and other positioning adjustments
 */
export function getShapedWidth(
  shaped: ShapedGlyph[],
  fontSize: number,
  unitsPerEm: number
): number {
  let width = 0

  for (const glyph of shaped) {
    width += glyph.ax
  }

  // Convert from font units to pixels
  return (width / unitsPerEm) * fontSize
}
