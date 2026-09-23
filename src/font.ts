/**
 * This class handles everything related to fonts.
 */
import opentype from '@shuding/opentype.js'
import { inflateSync } from 'fflate'
import { Locale, locales, isValidLocale } from './language.js'
import {
  shapeText,
  parseFontFeatureSettings,
  type ShapedGlyph,
} from './harfbuzz.js'
import { segment } from './utils.js'

const MAX_SHAPED_RUN_CACHE_ENTRIES = 256

/**
 * Check if a character is whitespace (space, tab, etc.)
 */
function isWhitespace(char: string): boolean {
  return /^\s$/.test(char)
}

/**
 * Split content into segments where each segment uses the same font.
 * Returns array of [text, font] pairs.
 *
 * Whitespace characters are kept with the preceding segment's font when
 * possible. This ensures proper spacing within text runs and prevents
 * HarfBuzz from shaping whitespace separately (which can cause spacing issues).
 */
function splitByFont(
  content: string,
  resolveFont: (word: string) => opentype.Font
): Array<[string, opentype.Font]> {
  if (!content) return []

  const graphemes = segment(content, 'grapheme')
  const result: Array<[string, opentype.Font]> = []

  let currentText = ''
  let currentFont: opentype.Font | null = null

  for (const grapheme of graphemes) {
    // For whitespace, try to keep it with the current font if the font
    // has a glyph for it. This maintains proper spacing within text runs.
    let font: opentype.Font
    if (isWhitespace(grapheme) && currentFont !== null) {
      // Check if current font has a glyph for this whitespace
      if (currentFont.charToGlyphIndex(grapheme)) {
        font = currentFont
      } else {
        font = resolveFont(grapheme)
      }
    } else {
      font = resolveFont(grapheme)
    }

    if (currentFont === null) {
      currentFont = font
      currentText = grapheme
    } else if (font === currentFont) {
      currentText += grapheme
    } else {
      result.push([currentText, currentFont])
      currentText = grapheme
      currentFont = font
    }
  }

  if (currentText && currentFont) {
    result.push([currentText, currentFont])
  }

  return result
}

/**
 * Convert WOFF to raw sfnt (TrueType/OpenType) format for HarfBuzz.
 */
function woffToSfnt(woff: ArrayBuffer): ArrayBuffer {
  const view = new DataView(woff)
  const numTables = view.getUint16(12)
  const sfntSize = view.getUint32(16)

  const sfnt = new ArrayBuffer(sfntSize)
  const out = new DataView(sfnt)
  const outBytes = new Uint8Array(sfnt)

  // Write sfnt header (flavor from WOFF becomes signature)
  out.setUint32(0, view.getUint32(4))
  out.setUint16(4, numTables)
  const entrySelector = Math.floor(Math.log2(numTables))
  const searchRange = (1 << entrySelector) * 16
  out.setUint16(6, searchRange)
  out.setUint16(8, entrySelector)
  out.setUint16(10, numTables * 16 - searchRange)

  let tableOffset = 12 + numTables * 16

  for (let i = 0; i < numTables; i++) {
    const entry = 44 + i * 20
    const tag = view.getUint32(entry)
    const offset = view.getUint32(entry + 4)
    const compLen = view.getUint32(entry + 8)
    const origLen = view.getUint32(entry + 12)
    const checksum = view.getUint32(entry + 16)

    // Write table record
    const record = 12 + i * 16
    out.setUint32(record, tag)
    out.setUint32(record + 4, checksum)
    out.setUint32(record + 8, tableOffset)
    out.setUint32(record + 12, origLen)

    // Decompress or copy table data
    if (compLen < origLen) {
      const compressed = new Uint8Array(woff, offset + 2, compLen - 2)
      const decompressed = new Uint8Array(origLen)
      inflateSync(compressed, decompressed)
      outBytes.set(decompressed, tableOffset)
    } else {
      outBytes.set(new Uint8Array(woff, offset, origLen), tableOffset)
    }

    tableOffset += (origLen + 3) & ~3
  }

  return sfnt
}

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

export type GlyphBox = {
  x1: number
  x2: number
  y1: number
  y2: number
}
type SkipInkBand = {
  underlineY: number
  strokeWidth: number
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
      fontFeatureSettings?: string
    }
  ) => number
  getSVG: (
    s: string,
    style: {
      fontSize: number
      top: number
      left: number
      letterSpacing: number
      fontFeatureSettings?: string
    },
    band?: SkipInkBand
  ) => { path: string; boxes: GlyphBox[] }
}

type ShapedRun = [text: string, font: opentype.Font, glyphs: ShapedGlyph[]]
type GetShapedRuns = (
  content: string,
  fontFeatureSettings?: string
) => ShapedRun[]

type BandPoint = [number, number]

type LineSegment = {
  from: BandPoint
  to: BandPoint
}

function flattenPath(commands: opentype.Path['commands']): LineSegment[] {
  const segments: LineSegment[] = []
  let start: BandPoint = [0, 0]
  let current: BandPoint = [0, 0]

  const addCurve = (points: BandPoint[], steps: number) => {
    let prev = points[0]
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const next = evaluateBezier(points, t)
      segments.push({ from: prev, to: next })
      prev = next
    }
    current = points[points.length - 1]
  }

  for (const cmd of commands) {
    if (cmd.type === 'M') {
      start = current = [cmd.x, cmd.y]
      continue
    }

    if (cmd.type === 'L') {
      const next: BandPoint = [cmd.x, cmd.y]
      segments.push({ from: current, to: next })
      current = next
      continue
    }

    if (cmd.type === 'Q') {
      addCurve([current, [cmd.x1, cmd.y1], [cmd.x, cmd.y]], 12)
      continue
    }

    if (cmd.type === 'C') {
      addCurve(
        [current, [cmd.x1, cmd.y1], [cmd.x2, cmd.y2], [cmd.x, cmd.y]],
        16
      )
      continue
    }

    if (cmd.type === 'Z') {
      segments.push({ from: current, to: start })
      current = start
    }
  }

  return segments
}

function evaluateBezier(points: BandPoint[], t: number): BandPoint {
  let working = points

  while (working.length > 1) {
    const next: BandPoint[] = []
    for (let i = 0; i < working.length - 1; i++) {
      next.push([
        working[i][0] + (working[i + 1][0] - working[i][0]) * t,
        working[i][1] + (working[i + 1][1] - working[i][1]) * t,
      ])
    }
    working = next
  }

  return working[0]
}

// Formats a coordinate exactly like opentype.js's `toPathData(1)`: integers
// print without a decimal point, everything else as `toFixed(1)`. The common
// case avoids `toFixed`, which dominated text rendering time. Values within a
// hair of a rounding tie, non-finite values, and magnitudes where the
// multiply could hide a tie are handed to `toFixed` so the output stays
// byte-identical.
function formatPathNumber(v: number): string {
  if (Math.round(v) === v) return '' + Math.round(v)
  const tenths = v * 10
  const fraction = tenths - Math.floor(tenths)
  if (!(Math.abs(fraction - 0.5) > 1e-7) || !(Math.abs(v) < 1e7)) {
    return v.toFixed(1)
  }
  const rounded = Math.round(tenths)
  const magnitude = Math.abs(rounded)
  const whole = Math.floor(magnitude / 10)
  const digit = magnitude - whole * 10
  return (v < 0 ? '-' : '') + whole + '.' + digit
}

function pack2(a: number, b: number): string {
  return formatPathNumber(a) + (b >= 0 ? ' ' : '') + formatPathNumber(b)
}

// Outline of one glyph scaled to a font size, in the order opentype.js emits
// it: `types` holds the command letters and `coords` the scaled x/y pairs
// (`x * scale`, `-y * scale`), so placing the glyph is one addition per value,
// the same operation `Glyph#getPath` performs. Cached per glyph and font size.
interface ScaledOutline {
  types: Uint8Array
  coords: Float64Array
}

const CMD_M = 77
const CMD_L = 76
const CMD_C = 67
const CMD_Q = 81
const CMD_Z = 90

// Font sizes are few per document; keep the cache per glyph small so a long
// running process with many sizes does not grow without bound.
const MAX_SCALED_OUTLINES_PER_GLYPH = 8
const scaledOutlineCache = new WeakMap<
  opentype.Glyph,
  Map<number, ScaledOutline>
>()

function getScaledOutline(
  glyph: opentype.Glyph,
  fontSize: number
): ScaledOutline {
  let bySize = scaledOutlineCache.get(glyph)
  if (!bySize) {
    bySize = new Map()
    scaledOutlineCache.set(glyph, bySize)
  }
  const cached = bySize.get(fontSize)
  if (cached) return cached

  const path = glyph.path
  const commands = path.commands
  const scale = (1 / (path.unitsPerEm || 1000)) * fontSize
  const types = new Uint8Array(commands.length)
  let count = 0
  for (let i = 0; i < commands.length; i++) {
    const type = commands[i].type
    if (type === 'C') count += 6
    else if (type === 'Q') count += 4
    else if (type === 'M' || type === 'L') count += 2
  }
  const coords = new Float64Array(count)
  let k = 0
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i]
    types[i] = cmd.type.charCodeAt(0)
    if (cmd.type === 'M' || cmd.type === 'L') {
      coords[k++] = cmd.x * scale
      coords[k++] = -cmd.y * scale
    } else if (cmd.type === 'C') {
      coords[k++] = cmd.x1 * scale
      coords[k++] = -cmd.y1 * scale
      coords[k++] = cmd.x2 * scale
      coords[k++] = -cmd.y2 * scale
      coords[k++] = cmd.x * scale
      coords[k++] = -cmd.y * scale
    } else if (cmd.type === 'Q') {
      coords[k++] = cmd.x1 * scale
      coords[k++] = -cmd.y1 * scale
      coords[k++] = cmd.x * scale
      coords[k++] = -cmd.y * scale
    }
  }

  if (bySize.size >= MAX_SCALED_OUTLINES_PER_GLYPH) {
    bySize.delete(bySize.keys().next().value)
  }
  const outline = { types, coords }
  bySize.set(fontSize, outline)
  return outline
}

// Path data for one glyph placed at (x, y), byte-identical to
// `glyph.getPath(x, y, fontSize).toPathData(1)`.
function glyphToPathData(
  glyph: opentype.Glyph,
  x: number,
  y: number,
  fontSize: number
): string {
  const { types, coords } = getScaledOutline(glyph, fontSize)
  let d = ''
  let k = 0
  for (let i = 0; i < types.length; i++) {
    const type = types[i]
    if (type === CMD_M || type === CMD_L) {
      d +=
        (type === CMD_M ? 'M' : 'L') + pack2(x + coords[k], y + coords[k + 1])
      k += 2
    } else if (type === CMD_C) {
      const x2 = x + coords[k + 2]
      const x3 = x + coords[k + 4]
      d +=
        'C' +
        pack2(x + coords[k], y + coords[k + 1]) +
        (x2 >= 0 ? ' ' : '') +
        pack2(x2, y + coords[k + 3]) +
        (x3 >= 0 ? ' ' : '') +
        pack2(x3, y + coords[k + 5])
      k += 6
    } else if (type === CMD_Q) {
      const x2 = x + coords[k + 2]
      d +=
        'Q' +
        pack2(x + coords[k], y + coords[k + 1]) +
        (x2 >= 0 ? ' ' : '') +
        pack2(x2, y + coords[k + 3])
      k += 4
    } else if (type === CMD_Z) {
      d += 'Z'
    }
  }
  return d
}

// Same output as `opentype.Path#toPathData(1)`, without the per-value
// `arguments` walk and `toFixed` calls. Used when band boxes need the
// command objects anyway.
function commandsToPathData(commands: opentype.Path['commands']): string {
  let d = ''
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i]
    if (cmd.type === 'M') {
      d += 'M' + pack2(cmd.x, cmd.y)
    } else if (cmd.type === 'L') {
      d += 'L' + pack2(cmd.x, cmd.y)
    } else if (cmd.type === 'C') {
      d +=
        'C' +
        pack2(cmd.x1, cmd.y1) +
        (cmd.x2 >= 0 ? ' ' : '') +
        pack2(cmd.x2, cmd.y2) +
        (cmd.x >= 0 ? ' ' : '') +
        pack2(cmd.x, cmd.y)
    } else if (cmd.type === 'Q') {
      d +=
        'Q' +
        pack2(cmd.x1, cmd.y1) +
        (cmd.x >= 0 ? ' ' : '') +
        pack2(cmd.x, cmd.y)
    } else if (cmd.type === 'Z') {
      d += 'Z'
    }
  }
  return d
}

function computeBandBox(
  commands: opentype.Path['commands'],
  band?: SkipInkBand
): GlyphBox[] {
  if (!band) return []

  const strokeWidth = band.strokeWidth
  const bandMin = band.underlineY - strokeWidth * 0.25
  const bandMax = band.underlineY + strokeWidth * 2.5

  const segments = flattenPath(commands)
  if (!segments.length) return []

  const bandHeight = bandMax - bandMin
  const ySamples = Math.max(12, Math.ceil(bandHeight / 0.25))
  const yStep = bandHeight / ySamples
  const yStart = bandMin + yStep / 2

  const columnHits = new Set<number>()

  for (let i = 0; i < ySamples; i++) {
    const y = yStart + yStep * i
    const intersections: number[] = []

    for (const seg of segments) {
      const [x1, y1] = seg.from
      const [x2, y2] = seg.to

      if (y1 === y2) continue
      const yMin = Math.min(y1, y2)
      const yMax = Math.max(y1, y2)
      if (y < yMin || y >= yMax) continue

      const t = (y - y1) / (y2 - y1)
      const x = x1 + (x2 - x1) * t
      intersections.push(x)
    }

    if (!intersections.length) continue
    intersections.sort((a, b) => a - b)

    for (let j = 0; j < intersections.length - 1; j += 2) {
      const from = Math.min(intersections[j], intersections[j + 1])
      const to = Math.max(intersections[j], intersections[j + 1])
      const start = Math.floor(from)
      const end = Math.ceil(to)
      for (let col = start; col < end; col++) {
        columnHits.add(col)
      }
    }
  }

  if (!columnHits.size) return []

  const columns = Array.from(columnHits.values()).sort((a, b) => a - b)
  const inkRanges: [number, number][] = []

  let rangeStart = columns[0]
  let prev = columns[0]
  for (let i = 1; i < columns.length; i++) {
    const col = columns[i]
    if (col > prev + 1) {
      inkRanges.push([rangeStart, prev + 1])
      rangeStart = col
    }
    prev = col
  }
  inkRanges.push([rangeStart, prev + 1])

  const boxes: GlyphBox[] = []
  const bleed = strokeWidth * 0.6
  const minX = inkRanges[0][0]
  const maxX = inkRanges[inkRanges.length - 1][1]

  for (const [x1, x2] of inkRanges) {
    const left = Math.min(x1, minX) - bleed
    const right = Math.max(x2, maxX) + bleed
    boxes.push({
      x1: left,
      x2: right,
      y1: bandMin,
      y2: bandMax,
    })
  }

  return boxes
}

function computeBoundingBox(
  commands: opentype.Path['commands']
): GlyphBox | null {
  const xs: number[] = []
  const ys: number[] = []

  for (const cmd of commands) {
    if ('x' in cmd && typeof cmd.x === 'number') xs.push(cmd.x)
    if ('y' in cmd && typeof cmd.y === 'number') ys.push(cmd.y)
    if ('x1' in cmd && typeof cmd.x1 === 'number') xs.push(cmd.x1)
    if ('y1' in cmd && typeof cmd.y1 === 'number') ys.push(cmd.y1)
    if ('x2' in cmd && typeof cmd.x2 === 'number') xs.push(cmd.x2)
    if ('y2' in cmd && typeof cmd.y2 === 'number') ys.push(cmd.y2)
  }

  if (!xs.length || !ys.length) {
    return null
  }

  return {
    x1: Math.min(...xs),
    x2: Math.max(...xs),
    y1: Math.min(...ys),
    y2: Math.max(...ys),
  }
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

const cachedParsedFont = new WeakMap<
  Buffer | ArrayBuffer,
  opentype.Font | null | undefined
>()

export default class FontLoader {
  defaultFont: opentype.Font
  fonts = new Map<string, [opentype.Font, Weight?, FontStyle?][]>()
  // Shaping results are cached on the loader (which persists across renders
  // for the same font configuration) so repeated renders don't re-shape
  // identical text runs with HarfBuzz.
  private shapedRunCache = new Map<string, ShapedRun[]>()
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
    // Adding fonts can change how text resolves across the font list, so
    // previously shaped runs may no longer be correct.
    if (fontOptions.length && this.fonts.size) {
      this.shapedRunCache.clear()
    }
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
      let font

      if (cachedParsedFont.has(data)) {
        font = cachedParsedFont.get(data)
      } else {
        // Convert Buffer to ArrayBuffer if needed
        const arrayBuffer =
          'buffer' in data
            ? data.buffer.slice(
                data.byteOffset,
                data.byteOffset + data.byteLength
              )
            : data

        font = opentype.parse(
          arrayBuffer,
          // @ts-ignore
          { lowMemory: true }
        )

        // Store the raw font data for HarfBuzz (convert WOFF to sfnt if needed)
        const bytes = new Uint8Array(arrayBuffer)
        const isWoff =
          bytes[0] === 0x77 &&
          bytes[1] === 0x4f &&
          bytes[2] === 0x46 &&
          bytes[3] === 0x46
        ;(font as any)._rawFontData = isWoff
          ? woffToSfnt(arrayBuffer)
          : arrayBuffer

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

        cachedParsedFont.set(data, font)
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

    // Text is shaped during both measurement and SVG generation, and the same
    // text is typically shaped again on subsequent renders. Cache the result
    // on the loader (keyed by the resolved font configuration) so both the
    // second pass of this render and future renders can reuse it.
    // Shaped glyphs are in font units, so the key only needs the inputs that
    // affect font resolution and shaping — not the font size.
    const shapedRunCache = this.shapedRunCache
    const engineKey = `${fontFamily.join(',')}|${fontWeight}|${fontStyle}|${
      locale || ''
    }`
    const getShapedRuns: GetShapedRuns = (content, fontFeatureSettings) => {
      const key = `${engineKey}\0${fontFeatureSettings || ''}\0${content}`
      const cached = shapedRunCache.get(key)

      if (cached !== undefined) {
        shapedRunCache.delete(key)
        shapedRunCache.set(key, cached)
        return cached
      }

      const features = fontFeatureSettings
        ? parseFontFeatureSettings(fontFeatureSettings)
        : {}
      const shapedRuns = splitByFont(content, resolveFont).map(
        ([text, font]): ShapedRun => [
          text,
          font,
          shapeText(font, text, { features }),
        ]
      )

      if (shapedRunCache.size >= MAX_SHAPED_RUN_CACHE_ENTRIES) {
        const oldestKey = shapedRunCache.keys().next().value
        if (oldestKey !== undefined) shapedRunCache.delete(oldestKey)
      }
      shapedRunCache.set(key, shapedRuns)
      return shapedRuns
    }

    const engine = {
      has: (s: string) => {
        if (s === '\n') return true
        const font = resolve(s)
        if (!font) return false
        // Use charToGlyphIndex directly instead of stringToGlyphs to avoid
        // triggering opentype.js GSUB processing which can emit warnings for
        // unsupported lookup types (e.g., "lookupType: 5 - substFormat: 3").
        // We only need to check if basic glyphs exist for the characters.
        for (const char of segment(s, 'grapheme')) {
          if (!font.charToGlyphIndex(char)) return false
        }
        return true
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
        return this.measure(s, style, getShapedRuns)
      },
      getSVG: (
        s: string,
        style: {
          fontSize: number
          top: number
          left: number
          letterSpacing: number
        },
        band?: SkipInkBand
      ) => {
        return this.getSVG(s, style, getShapedRuns, band)
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
    content: string,
    {
      fontSize,
      letterSpacing = 0,
      fontFeatureSettings,
    }: {
      fontSize: number
      letterSpacing: number
      fontFeatureSettings?: string
    },
    getShapedRuns: GetShapedRuns
  ) {
    const shapedRuns = getShapedRuns(content, fontFeatureSettings)

    let totalWidth = 0
    let glyphCount = 0
    for (const [, font, glyphs] of shapedRuns) {
      let segmentWidth = 0
      for (const glyph of glyphs) {
        segmentWidth += glyph.ax
      }

      totalWidth += (segmentWidth / font.unitsPerEm) * fontSize
      glyphCount += glyphs.length
    }

    const spacingWidth = letterSpacing * Math.max(0, glyphCount - 1)

    return totalWidth + spacingWidth
  }

  private getSVG(
    content: string,
    {
      fontSize,
      top,
      left,
      letterSpacing = 0,
      fontFeatureSettings,
    }: {
      fontSize: number
      top: number
      left: number
      letterSpacing: number
      fontFeatureSettings?: string
    },
    getShapedRuns: GetShapedRuns,
    band?: SkipInkBand
  ): { path: string; boxes: GlyphBox[] } {
    if (fontSize === 0) {
      return { path: '', boxes: [] }
    }

    const shapedRuns = getShapedRuns(
      content.replace(/\n/g, ''),
      fontFeatureSettings
    )

    const boxes: GlyphBox[] = []

    let cursorX = left
    const cursorY = top
    let hasRenderedGlyph = false

    let path = ''

    // Process each font segment
    for (const [, font, glyphs] of shapedRuns) {
      const scale = fontSize / font.unitsPerEm

      // DEBUG: Uncomment to trace glyph positions
      // console.log(`getSVG segment: "${text}", fontSize=${fontSize}, letterSpacing=${letterSpacing}`)

      // Process shaped glyphs for this segment
      for (let i = 0; i < glyphs.length; i++) {
        const shapedGlyph = glyphs[i]

        if (hasRenderedGlyph) {
          cursorX += letterSpacing
        }

        // Get the glyph from opentype.js by ID
        const glyph = font.glyphs.get(shapedGlyph.g)

        // DEBUG: Uncomment to trace glyph positions
        // const char = text[i] || '?'
        // console.log(`  [${i}] char="${char}" glyph=${shapedGlyph.g} cursorX=${cursorX.toFixed(2)} ax=${shapedGlyph.ax} advance=${(shapedGlyph.ax * scale).toFixed(2)}px`)

        if (glyph && glyph.path) {
          // Calculate glyph position
          const gX = cursorX + shapedGlyph.dx * scale
          const gY = cursorY + shapedGlyph.dy * scale

          if (band) {
            // Band boxes for text decoration skip-ink need the placed
            // command objects, so take the general path here.
            const glyphPath = glyph.getPath(gX, gY, fontSize, {})
            const bandBoxes = computeBandBox(glyphPath.commands, band)
            if (bandBoxes.length) {
              boxes.push(...bandBoxes)
            }
            path += commandsToPathData(glyphPath.commands)
          } else {
            path += glyphToPathData(glyph, gX, gY, fontSize)
          }
        }

        // Advance cursor by the shaped advance. Letter spacing is added before
        // every glyph after the first so it also crosses font fallbacks.
        cursorX += shapedGlyph.ax * scale
        hasRenderedGlyph = true
      }
    }

    return { path, boxes }
  }
}

function getLangFromFontName(name: string): Locale | undefined {
  const arr = name.split('_')
  const lang = arr[arr.length - 1]

  return lang === SUFFIX_WHEN_LANG_NOT_SET ? undefined : (lang as Locale)
}
