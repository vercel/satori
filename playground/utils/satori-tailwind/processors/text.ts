import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryValue,
  isArbitraryLengthValue,
  removeCSSDataTypePrefix,
  removeFirstAndLastChar
} from '../utils/arbitrary-value'
import addOpacity from '../utils/add-opacity'

/**
 * Handles font size and text color, both prefixed by `text-`.
 */
export default function processText(
  className: string,
  config: TailwindConfig
): CSSProperties | undefined {
  if (!className.startsWith('text-')) return

  let key = className.slice(5)
  let opacityKey: string | undefined

  if (key.split('/').length === 2) {
    ;[key, opacityKey] = key.split('/')
  }

  // Arbitrary length (e.g. [100px] or [length:var(--my-var)])
  if (isArbitraryLengthValue(key)) {
    return { fontSize: removeCSSDataTypePrefix(removeFirstAndLastChar(key)) }
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
    return { color }
  }

  const fontSizeAndRest:
    | string
    | [string, { lineHeight: string } | string]
    | undefined = (
    config.theme.fontSize as
      | Record<string, [string, { lineHeight: string }]>
      | undefined
  )?.[key]

  if (!fontSizeAndRest) return

  if (typeof fontSizeAndRest === 'string') {
    return { fontSize: fontSizeAndRest }
  }

  const rest =
    typeof fontSizeAndRest[1] === 'object'
      ? fontSizeAndRest[1]
      : { lineHeight: fontSizeAndRest[1] }
  return { fontSize: fontSizeAndRest[0], ...rest }
}
