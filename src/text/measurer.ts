import { FontEngine } from '../font.js'
import { segment } from '../utils.js'

export function genMeasurer(
  engine: FontEngine,
  isImage: (grapheme: string) => boolean,
  style: {
    fontSize: number
    letterSpacing: number
  }
): {
  measureGrapheme: (grapheme: string) => number
  measureGraphemeArray: (graphemes: string[]) => number
  measureText: (text: string) => number
} {
  const { fontSize, letterSpacing } = style

  const cache = new Map<string, number>()

  function measureGrapheme(grapheme: string): number {
    if (cache.has(grapheme)) {
      return cache.get(grapheme)
    }

    const width = engine.measure(grapheme, { fontSize, letterSpacing })
    cache.set(grapheme, width)

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
