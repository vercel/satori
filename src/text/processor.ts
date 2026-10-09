import { Locale } from '../language.js'
import {
  isString,
  lengthToNumber,
  segment,
  splitByBreakOpportunities,
} from '../utils.js'
import { HorizontalEllipsis, Space } from './characters.js'
import { SerializedStyle } from '../handler/expand.js'

export function preprocess(
  content: string,
  style: SerializedStyle,
  locale?: Locale
): {
  words: string[]
  requiredBreaks: boolean[]
  allowSoftWrap: boolean
  allowBreakWord: boolean
  allowBreakWordInMinContent: boolean
  processedContent: string
  shouldCollapseTabsAndSpaces: boolean
  lineLimit: number
  blockEllipsis: string
} {
  const { textTransform, whiteSpace, wordBreak, overflowWrap } = style

  content = processTextTransform(content, textTransform, locale)

  const {
    content: processedContent,
    shouldCollapseTabsAndSpaces,
    allowSoftWrap,
  } = processWhiteSpace(content, whiteSpace)

  const { words, requiredBreaks, allowBreakWord, allowBreakWordInMinContent } =
    processWordBreak(processedContent, wordBreak, overflowWrap as string)

  const [lineLimit, blockEllipsis] = processTextOverflow(style, allowSoftWrap)

  return {
    words,
    requiredBreaks,
    allowSoftWrap,
    allowBreakWord,
    allowBreakWordInMinContent,
    processedContent,
    shouldCollapseTabsAndSpaces,
    lineLimit,
    blockEllipsis,
  }
}

/**
 * The full-width forms of characters: the inverse of the `<wide>`
 * decompositions of fullwidth forms, and the `<narrow>` decompositions of
 * halfwidth forms.
 */
let fullWidthForms: Map<string, string> | undefined
function getFullWidthForms() {
  if (fullWidthForms) return fullWidthForms
  fullWidthForms = new Map()
  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) =>
      String.fromCodePoint(start + i)
    )
  for (const form of [
    '\u3000',
    ...range(0xff01, 0xff60),
    ...range(0xffe0, 0xffe6),
  ]) {
    const base = form.normalize('NFKD')
    if (base.length === 1) fullWidthForms.set(base, form)
  }
  // The decomposition of its base decomposes further.
  fullWidthForms.set('\u00af', '\uffe3')
  for (const form of [...range(0xff61, 0xff9f), ...range(0xffe8, 0xffee)]) {
    const base = form.normalize('NFKD')
    if (base !== form) fullWidthForms.set(form, base)
  }
  // Halfwidth Hangul letters, whose decompositions decompose further.
  for (const [start, end, base] of [
    [0xffa0, 0xffa0, 0x3164],
    [0xffa1, 0xffbe, 0x3131],
    [0xffc2, 0xffc7, 0x314f],
    [0xffca, 0xffcf, 0x3155],
    [0xffd2, 0xffd7, 0x315b],
    [0xffda, 0xffdc, 0x3161],
  ]) {
    for (let code = start; code <= end; code++) {
      fullWidthForms.set(
        String.fromCodePoint(code),
        String.fromCodePoint(base + code - start)
      )
    }
  }
  return fullWidthForms
}

/** The full-size kana of small kana. */
const FULL_SIZE_KANA: Record<string, string> = Object.fromEntries(
  [
    'ぁあ',
    'ぃい',
    'ぅう',
    'ぇえ',
    'ぉお',
    'ゕか',
    'ゖけ',
    'っつ',
    'ゃや',
    'ゅゆ',
    'ょよ',
    'ゎわ',
    'ァア',
    'ィイ',
    'ゥウ',
    'ェエ',
    'ォオ',
    'ヵカ',
    'ㇰク',
    'ヶケ',
    'ㇱシ',
    'ㇲス',
    'ッツ',
    'ㇳト',
    'ㇴヌ',
    'ㇵハ',
    'ㇶヒ',
    'ㇷフ',
    'ㇸヘ',
    'ㇹホ',
    'ㇺム',
    'ャヤ',
    'ュユ',
    'ョヨ',
    'ㇻラ',
    'ㇼリ',
    'ㇽル',
    'ㇾレ',
    'ㇿロ',
    'ヮワ',
    'ｧｱ',
    'ｨｲ',
    'ｩｳ',
    'ｪｴ',
    'ｫｵ',
    'ｯﾂ',
    'ｬﾔ',
    'ｭﾕ',
    'ｮﾖ',
    '\u{1b132}こ',
    '\u{1b150}ゐ',
    '\u{1b151}ゑ',
    '\u{1b152}を',
    '\u{1b155}コ',
    '\u{1b164}ヰ',
    '\u{1b165}ヱ',
    '\u{1b166}ヲ',
    '\u{1b167}ン',
  ].map((pair) => [...pair] as [string, string])
)

const mapCharacters = (content: string, map: (char: string) => string) =>
  Array.from(content, map).join('')

/**
 * Transforms the case of the text, then puts it in full-width forms, then
 * makes small kana full-size, by the keywords of `textTransform`.
 *
 * @see https://www.w3.org/TR/css-text-3/#text-transform-property
 */
export function processTextTransform(
  content: string,
  textTransform: string,
  locale?: Locale
): string {
  const keywords = new Set(
    typeof textTransform === 'string' ? textTransform.split(/\s+/) : []
  )
  if (keywords.has('uppercase')) {
    content = content.toLocaleUpperCase(locale)
  } else if (keywords.has('lowercase')) {
    content = content.toLocaleLowerCase(locale)
  } else if (keywords.has('capitalize')) {
    content = segment(content, 'word', locale)
      // For each word...
      .map((word) => {
        // ...split into graphemes...
        return segment(word, 'grapheme', locale)
          .map((grapheme, index) => {
            // ...and make the first grapheme uppercase
            return index === 0 ? grapheme.toLocaleUpperCase(locale) : grapheme
          })
          .join('')
      })
      .join('')
  }
  if (keywords.has('full-width')) {
    const forms = getFullWidthForms()
    content = mapCharacters(content, (char) => forms.get(char) ?? char)
  }
  if (keywords.has('full-size-kana')) {
    content = mapCharacters(content, (char) => FULL_SIZE_KANA[char] ?? char)
  }

  return content
}

function processTextOverflow(
  style: SerializedStyle,
  allowSoftWrap: boolean
): [number, string?] {
  const {
    textOverflow,
    lineClamp,
    WebkitLineClamp,
    WebkitBoxOrient,
    overflow,
    display,
  } = style

  if (display === 'block' && lineClamp) {
    const [lineLimit, blockEllipsis = HorizontalEllipsis] =
      parseLineClamp(lineClamp)
    if (lineLimit) {
      return [lineLimit, blockEllipsis]
    }
  }

  // Like in browsers, `-webkit-line-clamp` always ends in an ellipsis.
  if (
    display === '-webkit-box' &&
    WebkitBoxOrient === 'vertical' &&
    Number(WebkitLineClamp) > 0
  ) {
    return [Number(WebkitLineClamp), HorizontalEllipsis]
  }

  if (textOverflow === 'ellipsis' && overflow === 'hidden' && !allowSoftWrap) {
    return [1, HorizontalEllipsis]
  }

  return [Infinity]
}

/**
 * Whether words that don't fit are broken, and whether they're broken when
 * measuring the min-content size, which `overflowWrap: break-word` doesn't do.
 */
export function canBreakWords(wordBreak: string, overflowWrap: string) {
  const inMinContent =
    ['break-all', 'break-word'].includes(wordBreak) ||
    overflowWrap === 'anywhere'
  return {
    allowBreakWord: inMinContent || overflowWrap === 'break-word',
    allowBreakWordInMinContent: inMinContent,
  }
}

function processWordBreak(
  content,
  wordBreak: string,
  overflowWrap: string
): {
  words: string[]
  requiredBreaks: boolean[]
  allowBreakWord: boolean
  allowBreakWordInMinContent: boolean
} {
  const { allowBreakWord, allowBreakWordInMinContent } = canBreakWords(
    wordBreak,
    overflowWrap
  )

  const { words, requiredBreaks } = splitByBreakOpportunities(
    content,
    wordBreak
  )

  return { words, requiredBreaks, allowBreakWord, allowBreakWordInMinContent }
}

function processWhiteSpace(
  content: string,
  whiteSpace: string
): {
  content: string
  shouldCollapseTabsAndSpaces: boolean
  allowSoftWrap: boolean
} {
  const shouldKeepLinebreak = ['pre', 'pre-wrap', 'pre-line'].includes(
    whiteSpace
  )

  const shouldCollapseTabsAndSpaces = ['normal', 'nowrap', 'pre-line'].includes(
    whiteSpace
  )

  const allowSoftWrap = !['pre', 'nowrap'].includes(whiteSpace)

  if (!shouldKeepLinebreak) {
    content = content.replace(/\n/g, Space)
  }

  if (shouldCollapseTabsAndSpaces) {
    content = content.replace(/([ ]|\t)+/g, Space).replace(/^[ ]|[ ]$/g, '')
  }

  return { content, shouldCollapseTabsAndSpaces, allowSoftWrap }
}

function parseLineClamp(input: number | string): [number?, string?] {
  if (typeof input === 'number') return [input]

  const regex1 = /^(\d+)\s*"(.*)"$/
  const regex2 = /^(\d+)\s*'(.*)'$/
  const match1 = regex1.exec(input)
  const match2 = regex2.exec(input)

  if (match1) {
    const number = +match1[1]
    const text = match1[2]

    return [number, text]
  } else if (match2) {
    const number = +match2[1]
    const text = match2[2]

    return [number, text]
  }

  return []
}

/** The distance between tab stops, from `tabSize`. */
export function getTabWidth(style: SerializedStyle, spaceWidth: number) {
  const tabSize = style.tabSize ?? 8
  return isString(tabSize)
    ? lengthToNumber(tabSize, style.fontSize as number, 1, style)
    : spaceWidth * (tabSize as number)
}

/**
 * The advance of `count` tabs at `x` from the start of the line, which move
 * to the next tab stop. Like in browsers, the first one moves to the stop after
 * the next when it's closer than half a space.
 * https://drafts.csswg.org/css-text-3/#tab-size-property
 */
export function getTabAdvance(
  x: number,
  count: number,
  tabWidth: number,
  spaceWidth: number
) {
  if (!(tabWidth > 0)) return 0
  let advance = (Math.floor(x / tabWidth) + 1) * tabWidth - x
  if (advance < spaceWidth / 2) advance += tabWidth
  return advance + (count - 1) * tabWidth
}
