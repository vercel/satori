import { FontEngine } from '../font.js'
import { segment } from '../utils.js'

export function genMeasurer(
  engine: FontEngine,
  isImage: (grapheme: string) => boolean,
  style: {
    fontSize: number
    letterSpacing: number
    fontFeatureSettings?: string
    direction?: string
  }
): {
  measureGrapheme: (grapheme: string) => number
  measureGraphemeArray: (graphemes: string[]) => number
  measureText: (text: string) => number
} {
  const { fontSize, letterSpacing, fontFeatureSettings, direction } = style

  const cache = new Map<string, number>()

  function measureGrapheme(grapheme: string): number {
    let width = cache.get(grapheme)

    if (width === undefined) {
      width = engine.measure(grapheme, {
        fontSize,
        letterSpacing,
        fontFeatureSettings,
        direction,
      })
      cache.set(grapheme, width)
    }

    return width
  }

  function measureGraphemeArray(graphemes: string[]): number {
    let width = 0

    for (const grapheme of graphemes) {
      if (isImage(grapheme)) {
        width += fontSize
      } else {
        width += measureGrapheme(grapheme)
      }
    }

    // Add letterSpacing between graphemes.
    // Each measureGrapheme call returns glyph advances + intra-grapheme letterSpacing.
    // We need to add inter-grapheme letterSpacing (between adjacent graphemes).
    if (graphemes.length > 1 && letterSpacing) {
      width += letterSpacing * (graphemes.length - 1)
    }

    return width
  }

  function measureText(text: string): number {
    return measureGraphemeArray(segment(text, 'grapheme'))
  }

  return {
    measureGrapheme,
    measureGraphemeArray,
    measureText,
  }
}
