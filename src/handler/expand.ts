/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import transform, { getPropertyName } from 'css-to-react-native'
import CssDimension from 'parse-css-dimension'

// https://react-cn.github.io/react/tips/style-props-value-px.html
const optOutPx = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'fontWeight',
  'lineHeight',
  'opacity',
])

function purify(name: string, value?: string | number) {
  if (typeof value === 'number') {
    if (!optOutPx.has(name)) return value + 'px'
    return String(value)
  }
  return value
}

export default function expand(
  style: Record<string, string | number>,
  inheritedStyle: Record<string, string | number>
): Record<string, string | number> {
  const rules = []
  for (const prop in style) {
    const name = getPropertyName(prop)
    rules.push([name, purify(name, style[prop])])
  }
  const transformedStyle = transform(rules)

  // Calculate the base font size.
  let baseFontSize: number =
    transformedStyle.fontSize || inheritedStyle.fontSize
  if (typeof baseFontSize === 'string') {
    try {
      const parsed = new CssDimension(baseFontSize)
      switch (parsed.unit) {
        case 'em':
          baseFontSize = parsed.value * (inheritedStyle.fontSize as number)
          break
        case 'rem':
          baseFontSize = parsed.value * 16
          break
      }
    } catch (err) {
      baseFontSize = 16
    }
  }
  transformedStyle.fontSize = baseFontSize

  for (const prop in transformedStyle) {
    const value = transformedStyle[prop]

    // Convert em and rem values to px (number).
    if (typeof value === 'string') {
      try {
        const parsed = new CssDimension(value)
        if (parsed.type === 'length') {
          switch (parsed.unit) {
            case 'em':
              transformedStyle[prop] = parsed.value * baseFontSize
              break
            case 'rem':
              transformedStyle[prop] = parsed.value * 16
              break
          }
        }
      } catch (err) {}
    }
  }

  return transformedStyle
}
