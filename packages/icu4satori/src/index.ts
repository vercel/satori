// icu4satori — ICU4X-powered text engine for satori
//
// API mirrors satori's yoga pattern:
//
//   import { init, createTextEngine } from 'icu4satori'
//
//   // 1. Initialize WASM (same flexible input as satori's init)
//   await init(wasmInput)
//
//   // 2. Create engine from .postcard data blob
//   const textEngine = createTextEngine(new Uint8Array(dataBuffer))
//
//   // 3. Pass to satori
//   satori(<jsx />, { ..., textEngine })

import { initWasm, type InitInput } from './diplomat-wasm.js'
import {
  DataProvider,
  LineSegmenter,
  Locale,
  LineBreakOptions,
  LineBreakStrictness,
  LineBreakWordOption,
  CodePointMapData8,
  LineBreak,
} from '../vendor/index'

export type { InitInput }

/**
 * TextEngine — satori's text processing abstraction layer.
 *
 * Implemented by icu4satori, injected via satori's options.textEngine.
 * Uses pure JS types, no ICU4X dependency in the interface.
 */
export interface TextEngine {
  /**
   * Returns line break positions in the text.
   *
   * Each break includes a position (UTF-16 code unit offset) and a required flag.
   * - required=true: mandatory break (BK/CR/LF/NL per UAX#14 LB4/LB5)
   * - required=false: break opportunity
   *
   * Note: The first break at position=0 from ICU4X is skipped.
   */
  getLineBreaks(
    text: string,
    options?: {
      locale?: string
      wordBreak?: 'normal' | 'break-all' | 'keep-all'
      lineBreak?: 'normal' | 'loose' | 'strict' | 'anywhere'
    }
  ): Array<{ position: number; required: boolean }>

  /** Phase 2 (optional): Split text by word boundaries. */
  segmentWords?(text: string, locale?: string): string[]

  /** Phase 2 (optional): Split text by grapheme cluster boundaries. */
  segmentGraphemes?(text: string, locale?: string): string[]
}

/**
 * Initialize the ICU4X WASM module.
 * Must be called before createTextEngine().
 */
export async function init(input: InitInput): Promise<void> {
  await initWasm(input)
}

/**
 * LineBreak property values that indicate a mandatory (required) break.
 * See UAX#14 LB4/LB5: BK, CR, LF, NL all force a break.
 */
const REQUIRED_BREAK_VALUES = new Set([
  LineBreak.MandatoryBreak.ffiValue, // BK
  LineBreak.CarriageReturn.ffiValue, // CR
  LineBreak.LineFeed.ffiValue, // LF
  LineBreak.NextLine.ffiValue, // NL
])

function isRequiredBreak(
  lbMap: CodePointMapData8,
  text: string,
  position: number
): boolean {
  if (position >= text.length) return true // LB3: end of text
  if (position === 0) return false
  const cp = text.codePointAt(position - 1)
  return cp !== undefined && REQUIRED_BREAK_VALUES.has(lbMap.get(cp))
}

function mapWordBreak(wb: string) {
  switch (wb) {
    case 'break-all':
      return LineBreakWordOption.BreakAll
    case 'keep-all':
      return LineBreakWordOption.KeepAll
    default:
      return LineBreakWordOption.Normal
  }
}

function mapLineBreak(lb: string) {
  switch (lb) {
    case 'loose':
      return LineBreakStrictness.Loose
    case 'strict':
      return LineBreakStrictness.Strict
    case 'anywhere':
      return LineBreakStrictness.Anywhere
    default:
      return LineBreakStrictness.Normal
  }
}

/**
 * Create a TextEngine backed by ICU4X WASM + a .postcard data blob.
 * init() must be called before this function.
 */
export function createTextEngine(data: Uint8Array): TextEngine {
  const provider = DataProvider.fromByteSlice(data)
  const lbMap = CodePointMapData8.createLineBreakWithProvider(provider)

  return {
    getLineBreaks(text, options = {}) {
      const locale = options.locale
        ? Locale.fromString(options.locale)
        : Locale.fromString('en')

      const lbOptions = new LineBreakOptions({
        strictness: options.lineBreak ? mapLineBreak(options.lineBreak) : null,
        wordOption: options.wordBreak ? mapWordBreak(options.wordBreak) : null,
      })

      const segmenter = LineSegmenter.autoWithOptionsAndProvider(
        provider,
        locale,
        lbOptions
      )

      const iter = segmenter.segment(text)
      const breaks: Array<{ position: number; required: boolean }> = []
      let pos: number
      while ((pos = iter.next()) !== -1) {
        breaks.push({
          position: pos,
          required: isRequiredBreak(lbMap, text, pos),
        })
      }
      return breaks
    },
  }
}
