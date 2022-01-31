/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import transform, { getPropertyName } from 'css-to-react-native'
import CssDimension from 'parse-css-dimension'
import { multiply } from '../utils'

// https://react-cn.github.io/react/tips/style-props-value-px.html
const optOutPx = new Set([
  'flex',
  'flexGrow',
  'flexShrink',
  'flexBasis',
  'fontWeight',
  'lineHeight',
  'opacity',
  'scale',
  'scaleX',
  'scaleY',
])

const baseMatrix = [1, 0, 0, 1, 0, 0]

function purify(name: string, value?: string | number) {
  if (typeof value === 'number') {
    if (!optOutPx.has(name)) return value + 'px'
    return String(value)
  }
  // @TODO: For `transform`, we need to convert relative values to absolute
  // values here.
  return value
}

function lengthToNumber(
  length: string | number,
  baseFontSize: number
): number | undefined {
  if (typeof length === 'number') return length

  // Convert em and rem values to number (px), convert rad to deg.
  try {
    const parsed = new CssDimension(length)
    if (parsed.type === 'length') {
      switch (parsed.unit) {
        case 'em':
          return parsed.value * baseFontSize
        case 'rem':
          return parsed.value * 16
        default:
          return parsed.value
      }
    } else if (parsed.type === 'angle') {
      switch (parsed.unit) {
        case 'deg':
          return parsed.value
        case 'rad':
          return (parsed.value * 180) / Math.PI
        default:
          return parsed.value
      }
    }
  } catch (err) {}
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

  // Base transform matrix.
  const baseTransform =
    (inheritedStyle.transform as unknown as number[]) || baseMatrix

  for (const prop in transformedStyle) {
    const value = transformedStyle[prop]

    // Convert em and rem values to px (number).
    if (typeof value === 'string') {
      const len = lengthToNumber(value, baseFontSize)
      if (typeof len !== 'undefined') transformedStyle[prop] = len
    }

    // Handle CSS transforms To make it easier, we convert different transform
    // types directly to a matrix and apply it recursively to all its children.
    // @TODO: We need to convert relative values (50%) to absolute values. This
    // is pretty tricky to support as we need an extra pass to handle them after
    // the full layout pass.
    if (prop === 'transform') {
      let matrix = [...baseMatrix]
      const transforms = value as { [type: string]: number | string }[]

      // Transforms are applied from right to left.
      for (let i = transforms.length - 1; i >= 0; i--) {
        const transform = transforms[i]
        const type = Object.keys(transform)[0]
        const v = transform[type]
        const len = typeof v === 'string' ? lengthToNumber(v, baseFontSize) : v

        const transformMatrix = [...baseMatrix]
        switch (type) {
          case 'translateX':
            transformMatrix[4] = len
            break
          case 'translateY':
            transformMatrix[5] = len
            break
          case 'scaleX':
            transformMatrix[0] = len
            break
          case 'scaleY':
            transformMatrix[3] = len
            break
          case 'rotate':
            const rad = (len * Math.PI) / 180
            const c = Math.cos(rad)
            const s = Math.sin(rad)
            transformMatrix[0] = c
            transformMatrix[1] = s
            transformMatrix[2] = -s
            transformMatrix[3] = c
            break
          case 'skewX':
            transformMatrix[2] = Math.tan((len * Math.PI) / 180)
            break
          case 'skewY':
            transformMatrix[1] = Math.tan((len * Math.PI) / 180)
            break
        }
        matrix = multiply(matrix, transformMatrix)
      }

      transformedStyle.transform = multiply(baseTransform, matrix)
    }
  }

  return transformedStyle
}
