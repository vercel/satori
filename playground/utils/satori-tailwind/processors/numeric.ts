import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryValue,
  removeFirstAndLastChar,
  replaceUnderscore
} from '../utils/arbitrary-value'

const sizeRegex = '((m(in|ax)-)?[wh](?=-))'
const flexGrowShrinkRegex = '((grow|shrink)(?=(-|$)))' // Use (-|$) to take care of 1
const otherRegex = '(basis|tracking|opacity|origin(?=-))'
const regex = new RegExp(`^(${sizeRegex}|${flexGrowShrinkRegex}|${otherRegex})`)

const prefixToName: Record<string, keyof TailwindConfig['theme'] | undefined> =
  {
    w: 'width',
    h: 'height',
    'min-w': 'minWidth',
    'min-h': 'minHeight',
    'max-w': 'maxWidth',
    'max-h': 'maxHeight',
    grow: 'flexGrow',
    shrink: 'flexShrink',
    basis: 'flexBasis',
    tracking: 'letterSpacing',
    opacity: 'opacity',
    origin: 'transformOrigin'
  }

/**
 * Handles numeric-only classes
 */
export default function processNumeric(
  className: string,
  isNegative: boolean,
  config: TailwindConfig
): CSSProperties | undefined {
  const match = className.match(regex)
  if (!match) return

  const prefix = match[0]
  let key = className.slice(prefix.length)
  if (key) {
    key = key.slice(1) // Remove '-'
  } else {
    key = 'DEFAULT' // For flex grow/shrink
  }
  const name = prefixToName[prefix]
  if (!name) return

  // Arbitrary values
  if (isArbitraryValue(key)) {
    return { [name]: replaceUnderscore(removeFirstAndLastChar(key)) }
  }

  const val: string | undefined = (
    config.theme[name] as Record<string, string> | undefined
  )?.[key]
  if (!val) return

  const sign = isNegative && val[0].match(/\d/) ? '-' : ''
  return { [name]: `${sign}${val}` }
}
