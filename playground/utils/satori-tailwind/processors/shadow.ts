import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryShadowValue,
  removeFirstAndLastChar,
  replaceUnderscore,
  isArbitraryValue,
  removeCSSDataTypePrefix
} from '../utils/arbitrary-value'
import addOpacity from '../utils/add-opacity'

/**
 * Processes shadow-. For shadow color, return `--tw-shadow-color`.
 */
export default function processShadow(
  className: string,
  config: TailwindConfig
): CSSProperties | undefined {
  const match = className.match('^shadow(?=(-|$))')
  if (!match) return

  const prefix = match[0]
  let key = className.slice(prefix.length)
  if (key) {
    key = key.slice(1) // Remove '-'
  } else {
    key = 'DEFAULT' // For flex grow/shrink
  }

  let opacityKey: string | undefined

  if (key.split('/').length === 2) {
    ;[key, opacityKey] = key.split('/')
  }

  // Arbitrary values
  if (isArbitraryShadowValue(key)) {
    return { boxShadow: replaceUnderscore(removeFirstAndLastChar(key)) }
  }

  let color: string | undefined

  // Arbitrary color (e.g. [#50d71e])
  if (isArbitraryValue(key)) {
    color = removeCSSDataTypePrefix(removeFirstAndLastChar(key))
  } else {
    color = (config.theme.colors as Record<string, string> | undefined)?.[key]
  }

  let opacity: string | undefined

  if (opacityKey) {
    if (isArbitraryValue(opacityKey)) {
      opacity = removeFirstAndLastChar(opacityKey)
    } else {
      opacity = (config.theme.opacity as Record<string, string> | undefined)?.[
        opacityKey
      ]
    }
  }

  if (color) {
    if (opacity) {
      color = addOpacity(color, opacity)
    }
    return { ['--tw-shadow-color' as string]: color }
  }

  const boxShadow: string | undefined = (
    config.theme.boxShadow as Record<string, string> | undefined
  )?.[key]
  if (!boxShadow) return

  return { boxShadow }
}
