// This function guesses the human language (writing system) of the given
// JavaScript string, using the Unicode Alias in extended RegExp.
//
// You can learn more about this in:
// - https://en.wikipedia.org/wiki/Script_(Unicode)
// - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes
// - https://unicode.org/reports/tr18/#General_Category_Property
// - https://tc39.es/ecma262/multipage/text-processing.html#table-unicode-script-values

import createEmojiRegex from 'emoji-regex'

// Remove the "g" flag
const emojiRegex = new RegExp(createEmojiRegex(), '')

// Supported languages. The order matters.
// Usually, this is only for "special cases" like CJKV languages as latin
// characters are usually included in the base font, and can be safely fallback
// to the Noto Sans font. A list of special cases we want to support can be
// found here (sort by popularity):
// - https://fonts.google.com/noto/fonts?sort=popularity&noto.query=sans
//
// We can't tell if a hanzi(kanji) is Chinese or Japanese by regular expressions.
// - https://unicode.org/faq/han_cjk.html
const code = {
  emoji: emojiRegex,
  symbol: /\p{Symbol}/u,
  math: /\p{Math}/u,
  ja: /\p{scx=Hira}|\p{scx=Kana}|\p{scx=Han}|[\u3000]|[\uFF00-\uFFEF]/u,
  ko: /\p{scx=Hangul}/u,
  zh: /\p{scx=Han}/u,
  th: /\p{scx=Thai}/u,
  bn: /\p{scx=Bengali}/u,
  ar: /\p{scx=Arabic}/u,
  ta: /\p{scx=Tamil}/u,
  ml: /\p{scx=Malayalam}/u,
  he: /\p{scx=Hebrew}/u,
  te: /\p{scx=Telugu}/u,
  devanagari: /\p{scx=Devanagari}/u,
  kannada: /\p{scx=Kannada}/u,
} as const

type CodeKey = keyof typeof code
export type Locale = Exclude<CodeKey, 'emoji' | 'symbol' | 'math'>
export type LangCode = CodeKey | 'unknown'

export const locales = Object.keys(code).splice(3) as Locale[]
export function isValidLocale(x: any): x is Locale {
  return locales.includes(x)
}

// Here we assume all characters from the passed in "segment" is in the same
// written language. So if the string contains at least one matched character,
// we determine it as the matched language.
// Since some characters may belong to multiple languages simultaneously,
// we adjust the order of the languages by locale.
export function detectLanguageCode(segment: string, locale?: Locale): LangCode {
  const order = Object.keys(code) as CodeKey[]
  if (locale) {
    const index = order.indexOf(locale)
    if (index === -1) {
      throw new Error('locale is invalid')
    }
    order.splice(index, 1)
    order.unshift(locale)
  }

  for (const c of order) {
    if (code[c].test(segment)) {
      return c
    }
  }

  return 'unknown'
}

export function normalizeLocale(lang?: string): Locale | undefined {
  return locales.find(_locale => lang && lang.startsWith(_locale))
}
