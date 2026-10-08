import valueParser from 'postcss-value-parser'

import CssDimension from './vendor/parse-css-dimension/index.js'

/**
 * If key for each direction is missing, assume default (50%)
 */
export interface ParsedTransformOrigin {
  /** Relative horizontal transform origin in % */
  xRelative?: number
  /** Relative vertical transform origin in % */
  yRelative?: number
  /** Absolute horizontal transform origin in pixels */
  xAbsolute?: number
  /** Absolute horizontal transform origin in pixels */
  yAbsolute?: number
  /** Depth of the transform origin in pixels, 0 by default */
  zAbsolute?: number
}

interface ParsedUnit {
  /** Relative unit in % */
  relative?: number
  /** Absolute unit in pixels */
  absolute?: number
}

function parseUnit(word: string, baseFontSize: number): ParsedUnit {
  // Zero doesn't need a unit.
  if (/^[+-]?0*\.?0+$/.test(word)) return { absolute: 0 }
  try {
    const parsed = new CssDimension(word)
    switch (parsed.unit) {
      case 'px':
        return { absolute: parsed.value }
      case 'em':
        return { absolute: parsed.value * baseFontSize }
      case 'rem':
        return { absolute: parsed.value * 16 }
      case '%':
        return { relative: parsed.value }
      default:
        return {}
    }
  } catch (e) {
    return {}
  }
}

function handleWord(
  word: string,
  baseFontSize: number,
  unitIsHorizontal: boolean
) {
  switch (word) {
    case 'top':
      return { yRelative: 0 }
    case 'left':
      return { xRelative: 0 }
    case 'right':
      return { xRelative: 100 }
    case 'bottom':
      return { yRelative: 100 }
    case 'center':
      return {}
    default: {
      const parsedUnit = parseUnit(word, baseFontSize)
      return parsedUnit.absolute !== undefined
        ? {
            [unitIsHorizontal ? 'xAbsolute' : 'yAbsolute']: parsedUnit.absolute,
          }
        : parsedUnit.relative !== undefined
        ? {
            [unitIsHorizontal ? 'xRelative' : 'yRelative']: parsedUnit.relative,
          }
        : {}
    }
  }
}

export default function parseTransformOrigin(
  value: string | number,
  baseFontSize: number
): ParsedTransformOrigin {
  // If it's a single value and a number, then it's horizontal
  if (typeof value === 'number') {
    return { xAbsolute: value }
  }
  let words: string[]
  try {
    words = valueParser(value)
      .nodes.filter((node) => node.type === 'word')
      .map((node) => node.value)
  } catch (e) {
    return {}
  }

  if (words.length === 1) {
    // If it's a single value and a number, then it's horizontal, so
    // pass `true` to `unitIsHorizontal`
    return handleWord(words[0], baseFontSize, true)
  } else if (words.length === 2 || words.length === 3) {
    // The optional third value is the depth, which must be a length.
    const z = words.length === 3 ? parseUnit(words.pop(), baseFontSize) : {}
    if (z.relative !== undefined) return {}
    const depth = z.absolute ? { zAbsolute: z.absolute } : {}

    // Make words to be [horizontal, vertical]
    if (
      words[0] === 'top' ||
      words[0] === 'bottom' ||
      words[1] === 'left' ||
      words[1] === 'right'
    ) {
      words.reverse()
    }

    return {
      ...handleWord(words[0], baseFontSize, true),
      ...handleWord(words[1], baseFontSize, false),
      ...depth,
    }
  } else {
    return {}
  }
}
