import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryValue,
  removeFirstAndLastChar,
  removeCSSDataTypePrefix
} from '../utils/arbitrary-value'
import addOpacity from '../utils/add-opacity'

const regex = new RegExp(`^border(-[xytrbl])?(?=-)`)

const prefixesDirections: Record<string, string[] | undefined> = {
  border: ['borderColor'],
  'border-x': ['borderLeftColor', 'borderRightColor'],
  'border-y': ['borderTopColor', 'borderBottomColor'],
  'border-t': ['borderTopColor'],
  'border-r': ['borderRightColor'],
  'border-b': ['borderBottomColor'],
  'border-l': ['borderLeftColor']
}

/**
 * Handles border color.
 */
export default function processBorderColor(
  className: string,
  config: TailwindConfig
): CSSProperties | undefined {
  const match = className.match(regex)
  if (!match) return

  const prefix = match[0]
  let key = className.slice(prefix.length + 1)
  const directions = prefixesDirections[prefix]
  if (!directions) return

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

  let styles: Record<string, string> = {}
  if (color) {
    if (opacity) {
      color = addOpacity(color, opacity)
    }
    for (let direction of directions) {
      styles[direction] = color
    }
    return styles
  }
}
