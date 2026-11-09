/**
 * A simplified Unicode Bidirectional Algorithm. It resolves the levels of the
 * pieces of text that lines are made of, e.g. words and spaces, instead of
 * characters, and doesn't support explicit embeddings, isolates, bracket
 * pairs or terminators.
 * https://www.unicode.org/reports/tr9/
 */
import { segment } from '../utils.js'

/**
 * The bidi class of a piece of text: left-to-right, right-to-left, Arabic
 * letters, European or Arabic numbers, a common or European separator, or
 * neutral.
 */
export type BidiClass = 'L' | 'R' | 'AL' | 'EN' | 'AN' | 'CS' | 'ES' | 'N'

// The blocks of right-to-left scripts, e.g. Hebrew, Arabic, Syriac, Thaana,
// N'Ko and Adlam.
const RTL =
  /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff\u{10800}-\u{10fff}\u{1e800}-\u{1efff}]/u
// Those, and the right-to-left and Arabic letter marks.
const RTL_TEXT =
  /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff\u200f\u061c\u{10800}-\u{10fff}\u{1e800}-\u{1efff}]/u
// The blocks of scripts whose letters are Arabic letters (AL), e.g. Arabic,
// Syriac, Thaana and Hanifi Rohingya.
const ARABIC_LETTER =
  /[\u0600-\u07bf\u0860-\u08ff\ufb50-\ufdcf\ufdf0-\ufdff\ufe70-\ufeff\u{10d00}-\u{10d3f}\u{10f30}-\u{10f6f}\u{1ec70}-\u{1ecbf}\u{1ed00}-\u{1ed4f}\u{1ee00}-\u{1eeff}]/u
const LETTER = /\p{L}/u
const ARABIC_NUMBER = /[\u0660-\u0669\u066b\u066c\u08e2]/
const NUMBER = /\p{Nd}/u
const COMMON_SEPARATOR =
  /^[,./:\u00a0\u060c\u202f\u2044\ufe50\ufe52\ufe55\uff0c\uff0e\uff0f\uff1a]$/
const EUROPEAN_SEPARATOR =
  /^[+\-\u207a\u207b\u208a\u208b\u2212\ufb29\ufe62\ufe63\uff0b\uff0d]$/

/**
 * Whether the text has characters of right-to-left scripts, so it's
 * reordered even in left-to-right text.
 */
export function hasRTL(text: string) {
  return RTL_TEXT.test(text)
}

/**
 * The class of the first strong character, or of the numbers in the text, or
 * of a separator that is all of it.
 */
export function getBidiClass(text: string): BidiClass {
  if (COMMON_SEPARATOR.test(text)) return 'CS'
  if (EUROPEAN_SEPARATOR.test(text)) return 'ES'
  let number: BidiClass | undefined
  for (const char of text) {
    // The left-to-right, right-to-left and Arabic letter marks.
    if (char === '\u200e') return 'L'
    if (char === '\u200f') return 'R'
    if (char === '\u061c') return 'AL'
    if (LETTER.test(char)) {
      return ARABIC_LETTER.test(char) ? 'AL' : RTL.test(char) ? 'R' : 'L'
    }
    if (ARABIC_NUMBER.test(char)) number ??= 'AN'
    else if (NUMBER.test(char)) number ??= 'EN'
  }
  return number ?? 'N'
}

/**
 * Splits a piece of text with right-to-left characters where the class of its
 * graphemes changes, e.g. between Latin and Arabic letters or numbers, so
 * each part has one direction. Neutral graphemes stay with the part before
 * them.
 */
export function splitByDirection(text: string): string[] {
  if (!hasRTL(text)) return [text]
  const parts: string[] = []
  let part = ''
  let partClass: BidiClass = 'N'
  for (const grapheme of segment(text, 'grapheme')) {
    const graphemeClass = directionClass(getBidiClass(grapheme))
    if (graphemeClass !== 'N') {
      if (partClass !== 'N' && graphemeClass !== partClass) {
        parts.push(part)
        part = ''
      }
      partClass = graphemeClass
    }
    part += grapheme
  }
  if (part) parts.push(part)
  return parts
}

/** The class of a grapheme for splitting text by direction. */
function directionClass(type: BidiClass): BidiClass {
  if (type === 'AL') return 'R'
  if (type === 'CS' || type === 'ES') return 'N'
  return type
}

/**
 * The embedding levels of pieces of a paragraph with a base level of 0 for
 * left-to-right text, or 1 for right-to-left text. Right-to-left pieces are
 * at an odd level, and left-to-right ones and numbers at an even one, which
 * is higher than the base level for numbers.
 */
export function resolveLevels(
  classes: BidiClass[],
  baseLevel: 0 | 1
): number[] {
  const base = baseLevel === 1 ? 'R' : 'L'
  const types = classes.slice()

  // W2 and W3: European numbers after Arabic letters are Arabic numbers, and
  // Arabic letters are right-to-left.
  let lastLetter: BidiClass = base
  for (let i = 0; i < types.length; i++) {
    if (types[i] === 'L' || types[i] === 'R' || types[i] === 'AL') {
      lastLetter = types[i]
      if (types[i] === 'AL') types[i] = 'R'
    } else if (types[i] === 'EN' && lastLetter === 'AL') types[i] = 'AN'
  }

  // W4: a common separator between two numbers of the same type, or a
  // European separator between two European numbers, has their type, e.g.
  // the slash in "24/7". W6: other separators are neutral.
  for (let i = 0; i < types.length; i++) {
    if (types[i] !== 'CS' && types[i] !== 'ES') continue
    const before = types[i - 1]
    const after = types[i + 1]
    const joins =
      before === after &&
      (before === 'EN' || (before === 'AN' && types[i] === 'CS'))
    types[i] = joins ? before : 'N'
  }

  // W7: European numbers after left-to-right text are left-to-right.
  let lastStrong: BidiClass = base
  for (let i = 0; i < types.length; i++) {
    if (types[i] === 'L' || types[i] === 'R') lastStrong = types[i]
    else if (types[i] === 'EN' && lastStrong === 'L') types[i] = 'L'
  }

  // N1 and N2: neutrals between pieces of the same direction have it, and
  // numbers count as right-to-left. Other neutrals have the base direction.
  const direction = (type: BidiClass) => (type === 'L' ? 'L' : 'R')
  for (let i = 0; i < types.length; ) {
    if (types[i] !== 'N') {
      i++
      continue
    }
    let end = i
    while (end < types.length && types[end] === 'N') end++
    const before = i > 0 ? direction(types[i - 1]) : base
    const after = end < types.length ? direction(types[end]) : base
    types.fill(before === after ? before : base, i, end)
    i = end
  }

  // I1 and I2.
  return types.map((type) =>
    baseLevel === 1
      ? type === 'R'
        ? 1
        : 2
      : type === 'L'
      ? 0
      : type === 'R'
      ? 1
      : 2
  )
}

/**
 * Positions the pieces of a line, which are in logical order with their `x`
 * from the start of the line, by their levels. Like rule L2, from the highest
 * level to the lowest odd level, each run of pieces at that level or higher
 * is reversed, by mirroring it within its extent. Returns the left of each
 * piece, with the line from 0 to `lineWidth`, which spaces at the end of a
 * right-to-left line hang past on the left.
 */
export function reorderLine(
  pieces: { x: number; width: number }[],
  levels: number[],
  lineWidth: number
): number[] {
  const lefts = pieces.map(({ x }) => x)
  const highest = Math.max(0, ...levels)
  for (let level = highest; level >= 1; level--) {
    for (let start = 0; start < pieces.length; ) {
      if (levels[start] < level) {
        start++
        continue
      }
      let end = start
      while (end < pieces.length && levels[end] >= level) end++
      let runLeft = Infinity
      let runRight = -Infinity
      for (let i = start; i < end; i++) {
        runLeft = Math.min(runLeft, lefts[i])
        runRight = Math.max(runRight, lefts[i] + pieces[i].width)
      }
      runRight = Math.min(runRight, lineWidth)
      for (let i = start; i < end; i++) {
        lefts[i] = runLeft + runRight - lefts[i] - pieces[i].width
      }
      start = end
    }
  }
  return lefts
}
