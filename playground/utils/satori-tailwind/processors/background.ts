import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryValue,
  isArbitraryColorValueOrWithColorPrefix,
  removeCSSDataTypePrefix,
  removeFirstAndLastChar,
  replaceUnderscore,
  isArbitraryValueWithUrlPrefix,
  isArbitraryValueWithLengthPrefix
} from '../utils/arbitrary-value'
import addOpacity from '../utils/add-opacity'

/**
 * Handles background color, position, size, and image.
 */
export default function processBackground(
  className: string,
  config: TailwindConfig
): CSSProperties | undefined {
  if (!className.startsWith('bg-')) return

  let key = className.slice(3)
  let opacityKey: string | undefined

  if (key.split('/').length === 2) {
    ;[key, opacityKey] = key.split('/')
  }
  let color: string | undefined

  // Arbitrary color (e.g. [#50d71e])
  if (isArbitraryColorValueOrWithColorPrefix(key)) {
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
    return { backgroundColor: color }
  }

  let backgroundSize: string | undefined
  if (isArbitraryValueWithLengthPrefix(key)) {
    backgroundSize = removeCSSDataTypePrefix(
      replaceUnderscore(removeFirstAndLastChar(key))
    )
  } else {
    backgroundSize = (
      config.theme.backgroundSize as Record<string, string> | undefined
    )?.[key]
  }

  if (backgroundSize) {
    return { backgroundSize }
  }

  let backgroundImage: string | undefined
  if (isArbitraryValueWithUrlPrefix(key)) {
    backgroundImage = replaceUnderscore(removeFirstAndLastChar(key))
  } else {
    backgroundImage = (
      config.theme.backgroundImage as Record<string, string> | undefined
    )?.[key]
  }

  if (backgroundImage) {
    return { backgroundImage }
  }

  let backgroundPosition: string | undefined
  if (isArbitraryValue(key)) {
    backgroundPosition = replaceUnderscore(removeFirstAndLastChar(key))
  } else {
    backgroundPosition = (
      config.theme.backgroundPosition as Record<string, string> | undefined
    )?.[key]
  }

  if (backgroundPosition) {
    return { backgroundPosition }
  }
}
