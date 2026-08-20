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

  function measureTextRun(text: string): number {
    let width = cache.get(text)

    if (width === undefined) {
      width = engine.measure(text, {
        fontSize,
        letterSpacing,
        fontFeatureSettings,
      })
      cache.set(text, width)
    }

    return width
  }

  function measureGrapheme(grapheme: string): number {
    return measureTextRun(grapheme)
  }

  function measureGraphemeArray(graphemes: string[]): number {
    let width = 0
    let textRun = ''

    const flushTextRun = () => {
      if (textRun) {
        width += measureTextRun(textRun)
        textRun = ''
      }
    }

    for (const grapheme of graphemes) {
      if (isImage(grapheme)) {
        flushTextRun()
        width += fontSize
      } else {
        textRun += grapheme
      }
    }

    flushTextRun()

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
