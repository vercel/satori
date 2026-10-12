/**
 * A simplified Unicode Bidirectional Algorithm for lines with a right-to-left
 * base direction. It resolves the levels of the pieces of text that lines are
 * made of, e.g. words and spaces, instead of characters, and doesn't support
 * explicit embeddings, isolates or bracket pairs.
 * https://www.unicode.org/reports/tr9/
 */

/**
 * The bidi class of a piece of text: left-to-right, right-to-left, European
 * or Arabic numbers, or neutral.
 */
export type BidiClass = 'L' | 'R' | 'EN' | 'AN' | 'N'

// The blocks of right-to-left scripts, e.g. Hebrew, Arabic, Syriac, Thaana,
// N'Ko and Adlam.
const RTL =
  /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufeff\u{10800}-\u{10fff}\u{1e800}-\u{1efff}]/u
const LETTER = /\p{L}/u
const ARABIC_NUMBER = /[\u0660-\u0669\u066b\u066c\u08e2]/
const NUMBER = /\p{Nd}/u

/** The class of the first strong character, or of the numbers in the text. */
export function getBidiClass(text: string): BidiClass {
  let number: BidiClass | undefined
  for (const char of text) {
    // The left-to-right, right-to-left and Arabic letter marks.
    if (char === '\u200e') return 'L'
    if (char === '\u200f' || char === '\u061c') return 'R'
    if (LETTER.test(char)) return RTL.test(char) ? 'R' : 'L'
    if (ARABIC_NUMBER.test(char)) number ??= 'AN'
    else if (NUMBER.test(char)) number ??= 'EN'
  }
  return number ?? 'N'
}

/**
 * The embedding levels of pieces of a paragraph with a right-to-left base
 * direction: 1 for right-to-left pieces, and 2 for left-to-right ones and
 * numbers.
 */
export function resolveLevels(classes: BidiClass[]): number[] {
  const types = classes.slice()

  // W7: European numbers after left-to-right text are left-to-right.
  let lastStrong: BidiClass = 'R'
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
    const before = i > 0 ? direction(types[i - 1]) : 'R'
    const after = end < types.length ? direction(types[end]) : 'R'
    types.fill(before === after ? before : 'R', i, end)
    i = end
  }

  // I2: left-to-right pieces and numbers are a level higher.
  return types.map((type) => (type === 'R' ? 1 : 2))
}

/**
 * Positions the pieces of a line with a right-to-left base direction, which
 * are in logical order with their `x` from the start of the line. Pieces of
 * the line are mirrored, except runs of left-to-right pieces, which keep
 * their order. Returns the left of each piece, with the line from 0 to
 * `lineWidth`.
 */
export function reorderLine(
  pieces: { x: number; width: number }[],
  levels: number[],
  lineWidth: number
): number[] {
  const lefts = pieces.map(({ x, width }) => lineWidth - x - width)
  for (let start = 0; start < pieces.length; ) {
    if (levels[start] % 2 === 1) {
      start++
      continue
    }
    let end = start
    while (end < pieces.length && levels[end] % 2 === 0) end++
    // The run is moved to where it's mirrored to, in its own order.
    let runStart = Infinity
    let runLeft = Infinity
    for (let i = start; i < end; i++) {
      runStart = Math.min(runStart, pieces[i].x)
      runLeft = Math.min(runLeft, lefts[i])
    }
    for (let i = start; i < end; i++) {
      lefts[i] = runLeft + pieces[i].x - runStart
    }
    start = end
  }
  return lefts
}
