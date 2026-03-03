import { FontEngine } from '../font.js'
import { segment } from '../utils.js'

export function genMeasurer(
  engine: FontEngine,
  isImage: (grapheme: string) => boolean,
  style: {
    fontSize: number
    letterSpacing: number
    fontFeatureSettings?: string
  }
): {
  measureGrapheme: (grapheme: string) => number
  measureGraphemeArray: (graphemes: string[]) => number
  measureText: (text: string) => number
} {
  const { fontSize, letterSpacing, fontFeatureSettings } = style

  const cache = new Map<string, number>()

  function measureGrapheme(grapheme: string): number {
    let width = cache.get(grapheme)

    if (width === undefined) {
      width = engine.measure(grapheme, {
        fontSize,
        letterSpacing,
        fontFeatureSettings,
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
