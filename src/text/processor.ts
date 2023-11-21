import { Locale } from '../language.js'
import { isNumber, segment, splitByBreakOpportunities } from '../utils.js'
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
  processedContent: string
  shouldCollapseTabsAndSpaces: boolean
  lineLimit: number
  blockEllipsis: string
} {
  const { textTransform, whiteSpace, wordBreak } = style

  content = processTextTransform(content, textTransform, locale)

  const {
    content: processedContent,
    shouldCollapseTabsAndSpaces,
    allowSoftWrap,
  } = processWhiteSpace(content, whiteSpace)

  const { words, requiredBreaks, allowBreakWord } = processWordBreak(
    processedContent,
    wordBreak
  )

  const [lineLimit, blockEllipsis] = processTextOverflow(style, allowSoftWrap)

  return {
    words,
    requiredBreaks,
    allowSoftWrap,
    allowBreakWord,
    processedContent,
    shouldCollapseTabsAndSpaces,
    lineLimit,
    blockEllipsis,
  }
}

function processTextTransform(
  content: string,
  textTransform: string,
  locale?: Locale
): string {
  if (textTransform === 'uppercase') {
    content = content.toLocaleUpperCase(locale)
  } else if (textTransform === 'lowercase') {
    content = content.toLocaleLowerCase(locale)
  } else if (textTransform === 'capitalize') {
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

  if (
    textOverflow === 'ellipsis' &&
    display === '-webkit-box' &&
    WebkitBoxOrient === 'vertical' &&
    isNumber(WebkitLineClamp) &&
    WebkitLineClamp > 0
  ) {
    return [WebkitLineClamp, HorizontalEllipsis]
  }

  if (textOverflow === 'ellipsis' && overflow === 'hidden' && !allowSoftWrap) {
    return [1, HorizontalEllipsis]
  }

  return [Infinity]
}

function processWordBreak(
  content,
  wordBreak: string
): { words: string[]; requiredBreaks: boolean[]; allowBreakWord: boolean } {
  const allowBreakWord = ['break-all', 'break-word'].includes(wordBreak)

  const { words, requiredBreaks } = splitByBreakOpportunities(
    content,
    wordBreak
  )

  return { words, requiredBreaks, allowBreakWord }
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
