import type { ReactNode, ReactElement } from 'react'

import { LineBreaker } from 'css-line-break'
import { splitGraphemes } from 'text-segmentation'

export function isReactElement(node: ReactNode): node is ReactElement {
  const type = typeof node
  if (
    type === 'number' ||
    type === 'bigint' ||
    type === 'string' ||
    type === 'boolean'
  ) {
    return false
  }
  return true
}

export function isClass(f: Function) {
  return /^class\s/.test(Function.prototype.toString.call(f))
}

// Multiplies two 2d transform matrices.
export function multiply(m1: number[], m2: number[]) {
  return [
    m1[0] * m2[0] + m1[2] * m2[1],
    m1[1] * m2[0] + m1[3] * m2[1],
    m1[0] * m2[2] + m1[2] * m2[3],
    m1[1] * m2[2] + m1[3] * m2[3],
    m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
    m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
  ]
}

export function v(
  field: string | number,
  map: Record<string, any>,
  fallback: any
) {
  const value = map[field]
  return typeof value === 'undefined' ? fallback : value
}

// @TODO: Support "lang" attribute to modify the locale
const locale = undefined

const INTL_SEGMENTER_SUPPORTED =
  typeof Intl !== 'undefined' &&
  'Segmenter' in Intl &&
  process.env.NODE_ENV !== 'test'

const wordSegmenter = INTL_SEGMENTER_SUPPORTED
  ? new (Intl as any).Segmenter(locale, { granularity: 'word' })
  : null
const graphemeSegmenter = INTL_SEGMENTER_SUPPORTED
  ? new (Intl as any).Segmenter(locale, {
      granularity: 'grapheme',
    })
  : null

// Implementation modified from
// https://github.com/niklasvh/html2canvas/blob/6521a487d78172f7179f7c973c1a3af40eb92009/src/css/layout/text.ts
// https://drafts.csswg.org/css-text/#word-separator
export const wordSeparators = [
  0x0020, 0x00a0, 0x1361, 0x10100, 0x10101, 0x1039, 0x1091, 0xa,
].map((point) => String.fromCodePoint(point))

const breakWords = (str: string): string[] => {
  const breaker = LineBreaker(str, {
    lineBreak: 'strict',
    wordBreak: 'normal',
  })

  const words = []
  let bk

  while (!(bk = breaker.next()).done) {
    if (bk.value) {
      const value = bk.value.slice()
      let word = ''
      for (let i = 0; i < value.length; i++) {
        const char = value[i]
        if (!wordSeparators.includes(char)) {
          word += char
        } else {
          if (word.length) {
            words.push(word)
          }
          words.push(char)
          word = ''
        }
      }

      if (word.length) {
        words.push(word)
      }
    }
  }

  return words
}

export function segment(
  content: string,
  granularity: 'word' | 'grapheme'
): string[] {
  if (INTL_SEGMENTER_SUPPORTED) {
    return granularity === 'word'
      ? [...wordSegmenter.segment(content)].map((seg) => seg.segment)
      : [...graphemeSegmenter.segment(content)].map((seg) => seg.segment)
  }

  if (granularity === 'word') {
    return breakWords(content)
  } else {
    return splitGraphemes(content)
  }
}

export function buildXMLString(
  type: string,
  attrs: Record<string, any>,
  children?: string
) {
  let attrString = ''

  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v !== 'undefined') {
      attrString += ` ${k}="${v}"`
    }
  }

  if (children) {
    return `<${type}${attrString}>${children}</${type}>`
  }
  return `<${type}${attrString}/>`
}
