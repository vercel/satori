import cssColorParse from 'parse-css-color'

import { calcDegree, lengthToNumber, splitEffects } from '../utils.js'

export type BackdropFilter =
  | { type: 'blur'; value: number }
  | {
      type:
        | 'brightness'
        | 'contrast'
        | 'grayscale'
        | 'invert'
        | 'opacity'
        | 'saturate'
        | 'sepia'
      value: number
    }
  | { type: 'hue-rotate'; value: number }
  | {
      type: 'drop-shadow'
      offsetX: number
      offsetY: number
      blurRadius: number
      color: string
    }

const amountDefaults = {
  brightness: 1,
  contrast: 1,
  grayscale: 1,
  invert: 1,
  opacity: 1,
  saturate: 1,
  sepia: 1,
}

export function parseBackdropFilter(
  value: string | number,
  inheritedStyle: Record<string, string | number>,
  currentColor = 'black'
): BackdropFilter[] {
  if (value === 'none') return []
  if (typeof value !== 'string') {
    throw new Error('Invalid `backdropFilter` value: "' + value + '".')
  }

  const filters = splitEffects(value, /\s/).filter(Boolean)
  if (!filters.length) {
    throw new Error('Invalid `backdropFilter` value: "' + value + '".')
  }

  return filters.map((filter) => {
    const match = filter.match(/^([a-z-]+)\((.*)\)$/i)
    if (!match) {
      throw new Error('Invalid filter function in `backdropFilter`.')
    }

    const name = match[1].toLowerCase()
    const argument = match[2].trim()

    if (name === 'blur') {
      const radius = argument
        ? resolveLength(argument, inheritedStyle, 'blur()')
        : 0
      if (radius < 0) {
        throw new Error('Invalid `blur()` radius in `backdropFilter`.')
      }
      return { type: 'blur', value: radius }
    }

    if (name === 'hue-rotate') {
      const angle = argument === '0' || !argument ? 0 : calcDegree(argument)
      if (typeof angle === 'undefined') {
        throw new Error('Invalid `hue-rotate()` angle in `backdropFilter`.')
      }
      return { type: 'hue-rotate', value: angle }
    }

    if (name === 'drop-shadow') {
      return parseDropShadow(argument, inheritedStyle, currentColor)
    }

    if (name in amountDefaults) {
      const type = name as keyof typeof amountDefaults
      const amount = argument
        ? resolveAmount(argument, `${type}()`)
        : amountDefaults[type]
      const normalizedAmount = [
        'grayscale',
        'invert',
        'opacity',
        'sepia',
      ].includes(type)
        ? Math.min(amount, 1)
        : amount
      return { type, value: normalizedAmount } as BackdropFilter
    }

    throw new Error(`Unsupported \`${name}()\` in \`backdropFilter\`.`)
  })
}

function parseDropShadow(
  value: string,
  inheritedStyle: Record<string, string | number>,
  currentColor: string
): BackdropFilter {
  const parts = splitEffects(value, /\s/).filter(Boolean)
  let color = currentColor
  const lengths: string[] = []

  for (const part of parts) {
    if (cssColorParse(part)) {
      color = part
    } else {
      lengths.push(part)
    }
  }

  if (lengths.length < 2 || lengths.length > 3) {
    throw new Error('Invalid `drop-shadow()` value in `backdropFilter`.')
  }

  const offsetX = resolveLength(lengths[0], inheritedStyle, 'drop-shadow()')
  const offsetY = resolveLength(lengths[1], inheritedStyle, 'drop-shadow()')
  const blurRadius = lengths[2]
    ? resolveLength(lengths[2], inheritedStyle, 'drop-shadow()')
    : 0

  if (blurRadius < 0) {
    throw new Error('Invalid `drop-shadow()` blur radius in `backdropFilter`.')
  }

  return {
    type: 'drop-shadow',
    offsetX,
    offsetY,
    blurRadius,
    color,
  }
}

function resolveLength(
  value: string,
  inheritedStyle: Record<string, string | number>,
  functionName: string
) {
  const resolved = lengthToNumber(
    value,
    inheritedStyle.fontSize as number,
    0,
    inheritedStyle
  )
  if (typeof resolved === 'undefined') {
    throw new Error(
      `Invalid length \`${value}\` in \`${functionName}\` for \`backdropFilter\`.`
    )
  }
  return resolved
}

function resolveAmount(value: string, functionName: string) {
  const percentage = value.match(/^([+-]?(?:\d+\.?\d*|\.\d+))%$/)
  const amount = percentage ? Number(percentage[1]) / 100 : Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(
      `Invalid amount \`${value}\` in \`${functionName}\` for \`backdropFilter\`.`
    )
  }
  return amount
}
