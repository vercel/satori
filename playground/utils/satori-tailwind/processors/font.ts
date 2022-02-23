import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryValue,
  isArbitraryNumericOnlyValue,
  removeFirstAndLastChar,
  replaceUnderscore
} from '../utils/arbitrary-value'

/**
 * Handles font weight and font family, both prefixed by `font-`.
 */
export default function processFont(
  className: string,
  config: TailwindConfig
): CSSProperties | undefined {
  if (!className.startsWith('font-')) return

  const key = className.slice(5)

  // Arbitrary weight (e.g. [1100])
  if (isArbitraryNumericOnlyValue(key)) {
    return { fontWeight: removeFirstAndLastChar(key) }
  }

  // Arbitrary family (e.g. [Open_Sans])
  if (isArbitraryValue(key)) {
    return {
      fontFamily: replaceUnderscore(removeFirstAndLastChar(key))
    }
  }

  const fontWeight: string | undefined = (
    config.theme.fontWeight as Record<string, string> | undefined
  )?.[key]

  if (fontWeight) {
    return { fontWeight }
  }

  const fontFamily: string[] | undefined = (
    config.theme.fontFamily as Record<string, string[]> | undefined
  )?.[key]

  if (fontFamily) {
    return { fontFamily: fontFamily.join(', ') }
  }
}
