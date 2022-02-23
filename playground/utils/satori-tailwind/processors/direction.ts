import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryLengthValue,
  removeFirstAndLastChar,
  removeCSSDataTypePrefix
} from '../utils/arbitrary-value'

const marginRegex = '([mp][xytrbl]?(?=-))'
const positionRegex = '((inset(-[xy])?|top|right|bottom|left)(?=-))'
const borderRegex = '(border(-[xytrbl])?(?=(-|$)))' // Use (-|$) to take care of the 1px border case
const radiusRegex = '(rounded(-([trbl]|[tb][rl]))?(?=(-|$)))' // Use (-|$) to take care of the 0.25rem case
const regex = new RegExp(
  `^(${marginRegex}|${positionRegex}|${borderRegex}|${radiusRegex})`
)

function getThemeKey(
  className: string
): keyof TailwindConfig['theme'] | undefined {
  const firstChar = className[0]
  if (firstChar === 'b' || firstChar === 'r') {
    const thirdChar = className[2]
    return (
      {
        t: 'inset', // bo[t]tom
        r: 'borderWidth', // bo[r]der
        g: 'inset', // ri[g]ht
        u: 'borderRadius' // ro[u]nded
      } as const
    )[thirdChar]
  } else {
    return (
      {
        m: 'margin',
        p: 'padding',
        i: 'inset',
        t: 'inset',
        l: 'inset'
      } as const
    )[firstChar]
  }
}

const prefixesDirections: Record<string, string[] | undefined> = {
  m: ['margin'],
  mx: ['marginLeft', 'marginRight'],
  my: ['marginTop', 'marginBottom'],
  mt: ['marginTop'],
  mr: ['marginRight'],
  mb: ['marginBottom'],
  ml: ['marginLeft'],

  p: ['padding'],
  px: ['paddingLeft', 'paddingRight'],
  py: ['paddingTop', 'paddingBottom'],
  pt: ['paddingTop'],
  pr: ['paddingRight'],
  pb: ['paddingBottom'],
  pl: ['paddingLeft'],

  'inset-x': ['left', 'right'],
  'inset-y': ['top', 'bottom'],
  inset: ['top', 'right', 'bottom', 'left'],
  top: ['top'],
  right: ['right'],
  bottom: ['bottom'],
  left: ['left'],

  border: ['borderWidth'],
  'border-x': ['borderLeftWidth', 'borderRightWidth'],
  'border-y': ['borderTopWidth', 'borderBottomWidth'],
  'border-t': ['borderTopWidth'],
  'border-r': ['borderRightWidth'],
  'border-b': ['borderBottomWidth'],
  'border-l': ['borderLeftWidth'],

  rounded: ['borderRadius'],
  'rounded-t': ['borderTopLeftRadius', 'borderTopRightRadius'],
  'rounded-r': ['borderTopRightRadius', 'borderBottomRightRadius'],
  'rounded-b': ['borderBottomLeftRadius', 'borderBottomRightRadius'],
  'rounded-l': ['borderTopLeftRadius', 'borderBottomLeftRadius'],
  'rounded-tl': ['borderTopLeftRadius'],
  'rounded-tr': ['borderTopRightRadius'],
  'rounded-bl': ['borderBottomLeftRadius'],
  'rounded-br': ['borderBottomRightRadius']
}

/**
 * Handles directional numeric classes like margin/padding, position, and border width.
 */
export default function processDirection(
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
    key = 'DEFAULT' // For borders
  }
  const directions = prefixesDirections[prefix]
  const themeKey = getThemeKey(className)
  if (!themeKey || !directions) return

  let val: string | undefined = (
    config.theme[themeKey] as Record<string, string> | undefined
  )?.[key]
  if (!val) {
    // Arbitrary values
    if (isArbitraryLengthValue(key)) {
      val = removeCSSDataTypePrefix(removeFirstAndLastChar(key))
    } else {
      return
    }
  }

  const sign = isNegative && val[0].match(/\d/) ? '-' : ''
  let styles: Record<string, string> = {}
  for (let direction of directions) {
    styles[direction] = `${sign}${val}`
  }

  return styles
}
