/**
 * This class handles everything related to fonts.
 */
import opentype from '@shuding/opentype.js'
import { Locale, locales, isValidLocale } from './language.js'

export type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
export type WeightName = 'normal' | 'bold'
export type FontWeight = Weight | WeightName
export type FontStyle = 'normal' | 'italic'
const SUFFIX_WHEN_LANG_NOT_SET = 'unknown'

export interface FontOptions {
  data: Buffer | ArrayBuffer
  name: string
  weight?: Weight
  style?: FontStyle
  lang?: string
}

export type FontEngine = {
  has: (s: string) => boolean
  baseline: (s?: string, resolvedFont?: any) => number
  height: (s?: string, resolvedFont?: any) => number
  measure: (
    s: string,
    style: {
      fontSize: number
      letterSpacing: number
    }
  ) => number
  getSVG: (
    s: string,
    style: {
      fontSize: number
      top: number
      left: number
      letterSpacing: number
    }
  ) => string
}

function compareFont(
  weight,
  style,
  [matchedWeight, matchedStyle],
  [nextWeight, nextStyle]
) {
  if (matchedWeight !== nextWeight) {
    // Put the defined weight first.
    if (!matchedWeight) return 1
    if (!nextWeight) return -1

    // Exact match.
    if (matchedWeight === weight) return -1
    if (nextWeight === weight) return 1

    // 400 and 500.
    if (weight === 400 && matchedWeight === 500) return -1
    if (weight === 500 && matchedWeight === 400) return -1
    if (weight === 400 && nextWeight === 500) return 1
    if (weight === 500 && nextWeight === 400) return 1

    // Less than 400.
    if (weight < 400) {
      if (matchedWeight < weight && nextWeight < weight)
        return nextWeight - matchedWeight
      if (matchedWeight < weight) return -1
      if (nextWeight < weight) return 1
      return matchedWeight - nextWeight
    }

    // Greater than 500.
    if (weight < matchedWeight && weight < nextWeight)
      return matchedWeight - nextWeight
    if (weight < matchedWeight) return -1
    if (weight < nextWeight) return 1
    return nextWeight - matchedWeight
  }

  if (matchedStyle !== nextStyle) {
    // Exact match.
    if (matchedStyle === style) return -1
    if (nextStyle === style) return 1
  }

  return -1
}

export default class FontLoader {
  defaultFont: opentype.Font
  fonts = new Map<string, [opentype.Font, Weight?, FontStyle?][]>()
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
    weight: Weight | WeightName
    style: FontStyle
  }) {
    if (!this.fonts.has(name)) {
      return null
    }

    if (weight === 'normal') weight = 400
    if (weight === 'bold') weight = 700
    if (typeof weight === 'string')
      weight = Number.parseInt(weight, 10) as Weight

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
      const { name, data, lang } = fontOption
      if (lang && !isValidLocale(lang)) {
        throw new Error(
          `Invalid value for props \`lang\`: "${lang}". The value must be one of the following: ${locales.join(
            ', '
          )}.`
        )
      }
      const _lang = lang ?? SUFFIX_WHEN_LANG_NOT_SET
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

      // Modify the `charToGlyphIndex` method, so we can know which char is
      // being mapped to which glyph.
      const originalCharToGlyphIndex = font.charToGlyphIndex
      font.charToGlyphIndex = (char) => {
        const index = originalCharToGlyphIndex.call(font, char)
        if (index === 0) {
          // The current requested char is missing a glyph.
          if ((font as any)._trackBrokenChars) {
            ;(font as any)._trackBrokenChars.push(char)
          }
        }
        return index
      }

      // We use the first font as the default font fallback.
      if (!this.defaultFont) this.defaultFont = font

      const _name = `${name.toLowerCase()}_${_lang}`

      if (!this.fonts.has(_name)) {
        this.fonts.set(_name, [])
      }
      this.fonts.get(_name).push([font, fontOption.weight, fontOption.style])
    }
  }

  public getEngine(
    fontSize = 16,
    lineHeight: number | string = 'normal',
    {
      fontFamily = 'sans-serif',
      fontWeight = 400,
      fontStyle = 'normal',
    }: {
      fontFamily?: string | string[]
      fontWeight?: FontWeight
      fontStyle?: FontStyle
    },
    locale: Locale | undefined
  ): FontEngine {
    if (!this.fonts.size) {
      throw new Error(
        'No fonts are loaded. At least one font is required to calculate the layout.'
      )
    }

    fontFamily = (Array.isArray(fontFamily) ? fontFamily : [fontFamily]).map(
      (name) => name.toLowerCase()
    )
    const fonts = []
    fontFamily.forEach((face) => {
      const getNormal = this.get({
        name: face,
        weight: fontWeight,
        style: fontStyle,
      })
      if (getNormal) {
        fonts.push(getNormal)
        return
      }

      const getUnknown = this.get({
        name: face + '_unknown',
        weight: fontWeight,
        style: fontStyle,
      })

      if (getUnknown) {
        fonts.push(getUnknown)
        return
      }
    })

    // Add additional fonts as the fallback.
    const keys = Array.from(this.fonts.keys())
    const specifiedLangFonts = []
    const nonSpecifiedLangFonts = []
    const additionalFonts = []
    for (const name of keys) {
      if (fontFamily.includes(name)) continue
      if (locale) {
        const lang = getLangFromFontName(name)
        if (lang) {
          if (lang === locale) {
            specifiedLangFonts.push(
              this.get({
                name,
                weight: fontWeight,
                style: fontStyle,
              })
            )
          } else {
            nonSpecifiedLangFonts.push(
              this.get({
                name,
                weight: fontWeight,
                style: fontStyle,
              })
            )
          }
        } else {
          additionalFonts.push(
            this.get({
              name,
              weight: fontWeight,
              style: fontStyle,
            })
          )
        }
      } else {
        additionalFonts.push(
          this.get({
            name,
            weight: fontWeight,
            style: fontStyle,
          })
        )
      }
    }

    const cachedFontResolver = new Map<number, opentype.Font | undefined>()
    const resolveFont = (word: string, fallback = true) => {
      const _fonts = [
        ...fonts,
        ...additionalFonts,
        ...specifiedLangFonts,
        ...(fallback ? nonSpecifiedLangFonts : []),
      ]

      if (typeof word === 'undefined') {
        if (fallback) {
          return _fonts[_fonts.length - 1]
        }
        return undefined
      }

      const code = word.charCodeAt(0)
      if (cachedFontResolver.has(code)) return cachedFontResolver.get(code)

      const font = _fonts.find((_font, index) => {
        return (
          !!_font.charToGlyphIndex(word) ||
          (fallback && index === _fonts.length - 1)
        )
      })

      if (font) {
        cachedFontResolver.set(code, font)
      }

      return font
    }

    const ascender = (resolvedFont: opentype.Font, useOS2Table = false) => {
      const _ascender =
        (useOS2Table ? resolvedFont.tables?.os2?.sTypoAscender : 0) ||
        resolvedFont.ascender
      return (_ascender / resolvedFont.unitsPerEm) * fontSize
    }

    const descender = (resolvedFont: opentype.Font, useOS2Table = false) => {
      const _descender =
        (useOS2Table ? resolvedFont.tables?.os2?.sTypoDescender : 0) ||
        resolvedFont.descender
      return (_descender / resolvedFont.unitsPerEm) * fontSize
    }

    const height = (resolvedFont: opentype.Font, useOS2Table = false) => {
      if ('string' === typeof lineHeight && 'normal' === lineHeight) {
        const _lineGap =
          (useOS2Table ? resolvedFont.tables?.os2?.sTypoLineGap : 0) || 0
        return (
          ascender(resolvedFont, useOS2Table) -
          descender(resolvedFont, useOS2Table) +
          (_lineGap / resolvedFont.unitsPerEm) * fontSize
        )
      } else if ('number' === typeof lineHeight) {
        return fontSize * lineHeight
      }
    }

    const resolve = (s: string) => {
      return resolveFont(s, false)
    }

    const engine = {
      has: (s: string) => {
        if (s === '\n') return true
        const font = resolve(s)
        if (!font) return false
        ;(font as any)._trackBrokenChars = []
        font.stringToGlyphs(s)
        if (!(font as any)._trackBrokenChars.length) return true
        ;(font as any)._trackBrokenChars = undefined
        return false
      },
      baseline: (
        s?: string,
        resolvedFont = typeof s === 'undefined' ? fonts[0] : resolveFont(s)
      ) => {
        const asc = ascender(resolvedFont)
        const desc = descender(resolvedFont)
        const contentHeight = asc - desc

        return asc + (height(resolvedFont) - contentHeight) / 2
      },
      height: (
        s?: string,
        resolvedFont = typeof s === 'undefined' ? fonts[0] : resolveFont(s)
      ) => {
        return height(resolvedFont)
      },
      measure: (
        s: string,
        style: {
          fontSize: number
          letterSpacing: number
        }
      ) => {
        return this.measure(resolveFont, s, style)
      },
      getSVG: (
        s: string,
        style: {
          fontSize: number
          top: number
          left: number
          letterSpacing: number
        }
      ) => {
        return this.getSVG(resolveFont, s, style)
      },
    }

    return engine
  }

  private patchFontFallbackResolver(
    font: opentype.Font,
    resolveFont: (word: string, fallback?: boolean) => opentype.Font
  ) {
    const brokenChars = []
    ;(font as any)._trackBrokenChars = brokenChars

    const originalStringToGlyphs = font.stringToGlyphs
    font.stringToGlyphs = (s: string, ...args: any) => {
      const glyphs = originalStringToGlyphs.call(font, s, ...args)

      for (let i = 0; i < glyphs.length; i++) {
        // Hitting an undefined glyph. We have to try to resolve it from other
        // fonts.
        // @TODO: This affects the kerning resolution but should be fine for now.
        if (glyphs[i].unicode === undefined) {
          const char = brokenChars.shift()
          const anotherFont = resolveFont(char)
          if (anotherFont !== font) {
            const glyph = anotherFont.charToGlyph(char)
            // Scale the glyph to match the current units per em.
            const scale = font.unitsPerEm / anotherFont.unitsPerEm
            const p = new opentype.Path()
            p.unitsPerEm = font.unitsPerEm
            p.commands = glyph.path.commands.map((command) => {
              const scaledCommand = { ...command }
              for (let k in scaledCommand) {
                if (typeof scaledCommand[k] === 'number') {
                  scaledCommand[k] *= scale
                }
              }
              return scaledCommand
            })
            const g = new opentype.Glyph({
              ...glyph,
              advanceWidth: glyph.advanceWidth * scale,
              xMin: glyph.xMin * scale,
              xMax: glyph.xMax * scale,
              yMin: glyph.yMin * scale,
              yMax: glyph.yMax * scale,
              path: p,
            })

            glyphs[i] = g
          }
        }
      }

      return glyphs
    }

    return () => {
      font.stringToGlyphs = originalStringToGlyphs
      ;(font as any)._trackBrokenChars = undefined
    }
  }

  private measure(
    resolveFont: (word: string, fallback?: boolean) => opentype.Font,
    content: string,
    {
      fontSize,
      letterSpacing = 0,
    }: {
      fontSize: number
      letterSpacing: number
    }
  ) {
    const font = resolveFont(content)
    const unpatch = this.patchFontFallbackResolver(font, resolveFont)

    try {
      return font.getAdvanceWidth(content, fontSize, {
        letterSpacing: letterSpacing / fontSize,
      })
    } finally {
      unpatch()
    }
  }

  private getSVG(
    resolveFont: (word: string, fallback?: boolean) => opentype.Font,
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
    const font = resolveFont(content)
    const unpatch = this.patchFontFallbackResolver(font, resolveFont)

    try {
      if (fontSize === 0) {
        return ''
      }
      return font
        .getPath(content.replace(/\n/g, ''), left, top, fontSize, {
          letterSpacing: letterSpacing / fontSize,
        })
        .toPathData(1)
    } finally {
      unpatch()
    }
  }
}

function getLangFromFontName(name: string): Locale | undefined {
  const arr = name.split('_')
  const lang = arr[arr.length - 1]

  return lang === SUFFIX_WHEN_LANG_NOT_SET ? undefined : (lang as Locale)
}
