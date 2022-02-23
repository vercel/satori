import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryValue,
  removeCSSDataTypePrefix,
  removeFirstAndLastChar
} from '../utils/arbitrary-value'
import addOpacity from '../utils/add-opacity'

/**
 * Handles gradient color stops
 */
export default function processGradient(
  className: string,
  config: TailwindConfig
): CSSProperties | undefined {
  const match = className.match('^(from|via|to)(?=-)')
  if (!match) return

  const prefix = match[0]
  let key = className.slice(prefix.length + 1)
  let opacityKey: string | undefined

  if (key.split('/').length === 2) {
    ;[key, opacityKey] = key.split('/')
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
    if (prefix === 'from') {
      return {
        ['--tw-gradient-from' as string]: color
      }
    } else if (prefix === 'to') {
      return {
        ['--tw-gradient-to' as string]: color
      }
    } else {
      return {
        // Not used by tailwind, but will be processed later
        ['--tw-gradient-via' as string]: color
      }
    }
  }
}
