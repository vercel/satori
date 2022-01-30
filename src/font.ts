/**
 * This class handles everything related to fonts.
 */

import opentype from 'opentype.js'

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type WeigthName = 'normal' | 'bold'
type Style = 'normal' | 'italic'

export interface FontOptions {
  data: Buffer | ArrayBuffer
  name: string
  weight?: Weight
  style?: Style
}

export default class FontLoader {
  defaultFont: opentype.Font
  fonts = new Map<string, [opentype.Font, Weight?, Style?][]>()
  constructor(fontOptions: FontOptions[]) {
    for (const fontOption of fontOptions) {
      const data = fontOption.data
      const font =
        'buffer' in data
          ? opentype.parse(
              // Buffer to ArrayBuffer.
              data.buffer.slice(
                data.byteOffset,
                data.byteOffset + data.byteLength
              )
            )
          : opentype.parse(data)

      // We use the first font as the default font fallback.
      if (!this.defaultFont) this.defaultFont = font

      if (!this.fonts.has(fontOption.name)) {
        this.fonts.set(fontOption.name, [])
      }
      this.fonts
        .get(fontOption.name)
        .push([font, fontOption.weight, fontOption.style])
    }
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
      return this.defaultFont
    }

    if (weight === 'normal') weight = 400
    if (weight === 'bold') weight = 700

    // Fallback to the closest weight and style according to the strategy here:
    // https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight#fallback_weights
    const fonts = [...this.fonts.get(name)]
    fonts.sort(([_, weight1, style1], [__, weight2, style2]) => {
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
    })
    return fonts[0][0]
  }

  public measure(
    content: string,
    {
      fontFamily,
      fontSize,
      fontWeight = 400,
      fontStyle = 'normal',
    }: {
      fontFamily: string
      fontSize: number
      fontWeight?: Weight | WeigthName
      fontStyle?: Style
    }
  ) {
    const font = this.get({
      name: fontFamily,
      weight: fontWeight,
      style: fontStyle,
    })

    return {
      width: font.getAdvanceWidth(content, fontSize),
      ascent: (font.ascender / font.unitsPerEm) * fontSize,
      descent: -(font.descender / font.unitsPerEm) * fontSize,
    }
  }
}
