import { lengthToNumber, splitEffects } from '../utils.js'

export function parseBackdropFilter(
  value: string | number,
  inheritedStyle: Record<string, string | number>
) {
  if (value === 'none') return 0
  if (typeof value !== 'string') {
    throw new Error('Invalid `backdropFilter` value: "' + value + '".')
  }

  const filters = splitEffects(value, /\s/).filter(Boolean)
  if (filters.length !== 1) {
    throw new Error('Only a single `blur()` backdrop filter is supported.')
  }

  const match = filters[0].match(/^blur\((.*)\)$/)
  if (!match) {
    throw new Error('Only `blur()` is supported for `backdropFilter`.')
  }

  const radius = lengthToNumber(
    match[1],
    inheritedStyle.fontSize as number,
    0,
    inheritedStyle
  )
  if (typeof radius === 'undefined' || radius < 0) {
    throw new Error('Invalid `blur()` radius in `backdropFilter`.')
  }

  return radius
}
