import { type CSSProperties } from 'react'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import {
  isArbitraryValue,
  removeFirstAndLastChar
} from '../utils/arbitrary-value'

const regex = new RegExp(
  '^(scale(-[xy])?|rotate|translate-[xy]|skew-[xy])(?=-)'
)

const prefixToConfig: Record<
  string,
  keyof TailwindConfig['theme'] | undefined
> = {
  scale: 'scale',
  'scale-x': 'scale',
  'scale-y': 'scale',
  rotate: 'rotate',
  'translate-x': 'translate',
  'translate-y': 'translate',
  'skew-x': 'skew',
  'skew-y': 'skew'
}

const prefixToName: Record<string, string | undefined> = {
  scale: 'scale',
  'scale-x': 'scaleX',
  'scale-y': 'scaleY',
  rotate: 'rotate',
  'translate-x': 'translateX',
  'translate-y': 'translateY',
  'skew-x': 'skewX',
  'skew-y': 'skewY'
}

/**
 * Handles scale, rotate, translate, skew
 */
export default function processTransform(
  className: string,
  isNegative: boolean,
  config: TailwindConfig
): CSSProperties['transform'] | undefined {
  const match = className.match(regex)
  if (!match) return

  const prefix = match[0]
  const key = className.slice(prefix.length + 1)

  const configKey = prefixToConfig[prefix]
  const name = prefixToName[prefix]

  if (!configKey || !name) return

  let val: string | undefined
  if (isArbitraryValue(key)) {
    val = removeFirstAndLastChar(key)
  } else {
    val = (config.theme[configKey] as Record<string, string> | undefined)?.[key]
  }

  if (val) {
    const sign = isNegative && val[0].match(/\d/) ? '-' : ''
    return `${name}(${sign}${val})`
  }
}
