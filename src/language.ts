// This function guesses the human language (writing system) of the given
// JavaScript string, using the Unicode Alias in extended RegExp.
//
// You can learn more about this in:
// - https://en.wikipedia.org/wiki/Script_(Unicode)
// - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes
// - https://unicode.org/reports/tr18/#General_Category_Property
// - https://tc39.es/ecma262/multipage/text-processing.html#table-unicode-script-values

import createEmojiRegex from 'emoji-regex-xs'

const emojiRegex = new RegExp(createEmojiRegex(), 'u')

// Supported languages. The order matters.
// Usually, this is only for "special cases" like CJKV languages as latin
// characters are usually included in the base font, and can be safely fallback
// to the Noto Sans font. A list of special cases we want to support can be
// found here (sort by popularity):
// - https://fonts.google.com/noto/fonts?sort=popularity&noto.query=sans
//
// We can't tell if a hanzi(kanji) is Chinese or Japanese by regular expressions.
// - https://unicode.org/faq/han_cjk.html

const specialCode = {
  emoji: emojiRegex,
  symbol: /\p{Symbol}/u,
  math: /\p{Math}/u,
} as const

const code = {
  'ja-JP': /\p{scx=Hira}|\p{scx=Kana}|\p{scx=Han}|[\u3000]|[\uFF00-\uFFEF]/u,
  'ko-KR': /\p{scx=Hangul}/u,
  'zh-CN': /\p{scx=Han}/u,
  'zh-TW': /\p{scx=Han}/u,
  'zh-HK': /\p{scx=Han}/u,
  'th-TH': /\p{scx=Thai}/u,
  'bn-IN': /\p{scx=Bengali}/u,
  'ar-AR': /\p{scx=Arabic}/u,
  'ta-IN': /\p{scx=Tamil}/u,
  'ml-IN': /\p{scx=Malayalam}/u,
  'he-IL': /\p{scx=Hebrew}/u,
  'te-IN': /\p{scx=Telugu}/u,
  devanagari: /\p{scx=Devanagari}/u,
  kannada: /\p{scx=Kannada}/u,
} as const

type SpecialCodeKey = keyof typeof specialCode
type CodeKey = keyof typeof specialCode | keyof typeof code
export type Locale = keyof typeof code
export type LangCode = CodeKey | 'unknown'

export const locales = Object.keys({ ...code, ...specialCode }) as Locale[]
export function isValidLocale(x: any): x is Locale {
  return locales.includes(x)
}

export function detectLanguageCode(
  segment: string,
  locale?: Locale
): Array<Locale> | ['unknown'] | [SpecialCodeKey] {
  for (const c of Object.keys(specialCode) as SpecialCodeKey[]) {
    if (specialCode[c].test(segment)) {
      return [c]
    }
  }

  const languages = Object.keys(code).filter((lang) =>
    code[lang].test(segment)
  ) as Locale[]

  if (languages.length === 0) {
    return ['unknown']
  }

  if (locale) {
    const index = languages.findIndex((lang) => lang === locale)
    if (index !== -1) {
      languages.splice(index, 1)
      languages.unshift(locale)
    }
  }

  return languages
}

export function normalizeLocale(locale?: string): Locale | undefined {
  if (locale) {
    return locales.find((l) => l.toLowerCase().startsWith(locale.toLowerCase()))
  }
}
