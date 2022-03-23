/**
 * This class handles everything related to fonts.
 */
import opentype from '@shuding/opentype.js'

import { segment } from './utils'

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type WeigthName = 'normal' | 'bold'
type Style = 'normal' | 'italic'

export interface FontOptions {
  data: Buffer | ArrayBuffer
  name: string
  weight?: Weight
  style?: Style
}

function compareFont(weight, style, [weight1, style1], [weight2, style2]) {
  if (weight1 !== weight2) {
    // Put the defined weight first.
    if (!weight1) return 1
    if (!weight2) return -1

    // Exact match.
    if (weight1 === weight) return -1
    if (weight2 === weight) return 1

    // 400 and 500.
    if (weight === 400 && weight1 === 500) return -1
    if (weight === 500 && weight1 === 400) return -1
    if (weight === 400 && weight2 === 500) return 1
    if (weight === 500 && weight2 === 400) return 1

    // Less than 400.
    if (weight < 400) {
      if (weight1 < weight && weight2 < weight) return weight2 - weight1
      if (weight1 < weight) return -1
      if (weight2 < weight) return 1
      return weight1 - weight2
    }

    // Greater than 500.
    if (weight < weight1 && weight < weight2) return weight1 - weight2
    if (weight < weight1) return -1
    if (weight < weight2) return 1
    return weight2 - weight1
  }

  if (style1 !== style2) {
    // Exact match.
    if (style1 === style) return -1
    if (style2 === style) return 1
  }

  return -1
}

export default class FontLoader {
  defaultFont: opentype.Font
  fonts = new Map<string, [opentype.Font, Weight?, Style?][]>()
  constructor(fontOptions: FontOptions[]) {
    this.addFonts(fontOptions)
  }

  // Get font by name and weight.
  private get({
    name,
    weight,
    style,
  }: {
    name: string
    weight: Weight | WeigthName
    style: Style
  }) {
    if (!this.fonts.has(name)) {
      return null
    }

    if (weight === 'normal') weight = 400
    if (weight === 'bold') weight = 700

    const fonts = [...this.fonts.get(name)]

    let matchedFont = fonts[0]

    // Fallback to the closest weight and style according to the strategy here:
    // https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#fallback_weights
    for (let i = 1; i < fonts.length; i++) {
      const [, weight1, style1] = matchedFont
      const [, weight2, style2] = fonts[i]
      if (
        compareFont(weight, style, [weight1, style1], [weight2, style2]) > 0
      ) {
        matchedFont = fonts[i]
      }
    }

    return matchedFont[0]
  }

  public addFonts(fontOptions: FontOptions[]) {
    for (const fontOption of fontOptions) {
      const data = fontOption.data
      const font = opentype.parse(
        // Buffer to ArrayBuffer.
        'buffer' in data
          ? data.buffer.slice(
              data.byteOffset,
              data.byteOffset + data.byteLength
            )
          : data,
        // @ts-ignore
        { lowMemory: true }
      )

      // We use the first font as the default font fallback.
      if (!this.defaultFont) this.defaultFont = font

      const name = fontOption.name.toLowerCase()
      if (!this.fonts.has(name)) {
        this.fonts.set(name, [])
      }
      this.fonts.get(name).push([font, fontOption.weight, fontOption.style])
    }
  }

  public getEngine(
    fontSize = 16,
    lineHeight = 1.2,
    {
      fontFamily,
      fontWeight = 400,
      fontStyle = 'normal',
    }: {
      fontFamily: string | string[]
      fontWeight?: Weight | WeigthName
      fontStyle?: Style
    }
  ) {
    fontFamily = Array.isArray(fontFamily) ? fontFamily : [fontFamily]
    const fonts = fontFamily
      .map((face) =>
        this.get({
          name: face,
          weight: fontWeight,
          style: fontStyle,
        })
      )
      .filter(Boolean)

    // Add additional fonts as the fallback.
    for (const name of this.fonts.keys()) {
      if (fontFamily.includes(name)) continue
      fonts.push(
        this.get({
          name,
          weight: fontWeight,
          style: fontStyle,
        })
      )
    }

    const cachedFontResolver = new Map<string, opentype.Font | undefined>()
    const resolveFont = (word: string, fallback = true) => {
      if (cachedFontResolver.has(word)) return cachedFontResolver.get(word)

      const s = segment(word, 'grapheme')[0]
      if (cachedFontResolver.has(s)) return cachedFontResolver.get(s)

      const font = fonts.find((font, index) => {
        return (
          !!font.charToGlyphIndex(s) || (fallback && index === fonts.length - 1)
        )
      })

      if (font) {
        cachedFontResolver.set(s, font)
        cachedFontResolver.set(word, font)
      }
      return font
    }

    const ascender = (resolvedFont: opentype.Font, useOS2Table = false) => {
      const ascender =
        (useOS2Table ? resolvedFont.tables?.os2?.sTypoAscender : 0) ||
        resolvedFont.ascender
      return (ascender / resolvedFont.unitsPerEm) * fontSize
    }
    const descender = (resolvedFont: opentype.Font, useOS2Table = false) => {
      const descender =
        (useOS2Table ? resolvedFont.tables?.os2?.sTypoDescender : 0) ||
        resolvedFont.descender
      return (descender / resolvedFont.unitsPerEm) * fontSize
    }

    const engine = {
      resolve: (s: string) => {
        return resolveFont(s, false)
      },
      baseline: (
        s?: string,
        resolvedFont = typeof s === 'undefined' ? fonts[0] : resolveFont(s)
      ) => {
        // https://www.w3.org/TR/CSS2/visudet.html#leading
        // Note. It is recommended that implementations that use OpenType or
        // TrueType fonts use the metrics "sTypoAscender" and "sTypoDescender"
        // from the font's OS/2 table for A and D (after scaling to the current
        // element's font size). In the absence of these metrics, the "Ascent"
        // and "Descent" metrics from the HHEA table should be used.
        const A = ascender(resolvedFont, true)
        const D = descender(resolvedFont, true)
        const sGlyphHeight = A - D
        const glyphHeight = engine.glyphHeight(s, resolvedFont)
        const sTypoOffset = (glyphHeight - sGlyphHeight) / 2
        const { yMax, yMin } = resolvedFont.tables.head
        const baseline = yMax / (yMax - yMin)

        return sTypoOffset + baseline * glyphHeight
      },
      glyphHeight: (
        s?: string,
        resolvedFont = typeof s === 'undefined' ? fonts[0] : resolveFont(s)
      ) => {
        return (
          ((ascender(resolvedFont) - descender(resolvedFont)) * lineHeight) /
          1.2
        )
      },
      measure: (s: string, style: any) => {
        // Find the first font that supports rendering this segment, or fallback
        // to use the last one.
        const resolvedFont = resolveFont(s)
        return this.measure(resolvedFont, s, style)
      },
      getSVG: (s: string, style: any) => {
        const resolvedFont = resolveFont(s)
        return this.getSVG(resolvedFont, s, style)
      },
    }

    return engine
  }

  public measure(
    font: opentype.Font,
    content: string,
    {
      fontSize,
      letterSpacing = 0,
    }: {
      fontSize: number
      letterSpacing: number
    }
  ) {
    return font.getAdvanceWidth(content, fontSize, {
      letterSpacing: letterSpacing / fontSize,
    })
  }

  public getSVG(
    font: opentype.Font,
    content: string,
    {
      fontSize,
      top,
      left,
      letterSpacing = 0,
    }: {
      fontSize: number
      top: number
      left: number
      letterSpacing: number
    }
  ) {
    return font
      .getPath(content, left, top, fontSize, {
        letterSpacing: letterSpacing / fontSize,
      })
      .toPathData(1)
  }
}
