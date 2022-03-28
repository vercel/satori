/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import { getPropertyName, getStylesForProperty } from 'css-to-react-native'
import { parseElementStyle } from 'css-background-parser'

import CssDimension from '../vendor/parse-css-dimension'
import parseTransformOrigin from '../transform-origin'
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
const keepNumber = new Set(['lineHeight'])

const baseMatrix = [1, 0, 0, 1, 0, 0]

/**
 * A trick to fix `border: 1px solid` to not use `black` but the inherited
 * `color` value. This is necessary because css-to-react-native automatically
 * fallbacks to default color values.
 */
function handleFallbackColor(
  prop: string,
  parsed: Record<string, string>,
  rawInput: string,
  color: string
) {
  if (prop === 'border' && !rawInput.includes(parsed.borderColor)) {
    parsed.borderColor = color
  } else if (
    prop === 'textDecoration' &&
    !rawInput.includes(parsed.textDecorationColor)
  ) {
    parsed.textDecorationColor = color
  }
  return parsed
}

function purify(name: string, value?: string | number) {
  if (typeof value === 'number') {
    if (!optOutPx.has(name)) return value + 'px'
    if (keepNumber.has(name)) return value
    return String(value)
  }
  // @TODO: For `transform`, we need to convert relative values to absolute
  // values here.
  return value
}

function handleSpecialCase(name: string, value: string | number) {
  if (name === 'lineHeight') return { lineHeight: purify(name, value) }
  if (name === 'fontFamily')
    return {
      fontFamily: (value as string).split(',').map((v) => {
        return v
          .trim()
          .replace(/(^['"])|(['"]$)/g, '')
          .toLocaleLowerCase()
      }),
    }
  return null
}

function lengthToNumber(
  length: string | number,
  baseFontSize: number,
  inheritedStyle: Record<string, string | number>,
  { percentage }: { percentage: boolean } = { percentage: false }
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
        case 'vw':
          return ~~(
            (parsed.value * (inheritedStyle._viewportWidth as number)) /
            100
          )
        case 'vh':
          return ~~(
            (parsed.value * (inheritedStyle._viewportHeight as number)) /
            100
          )
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
    } else if (parsed.type === 'percentage') {
      if (percentage) {
        return (parsed.value / 100) * baseFontSize
      }
    }
  } catch (err) {}
}

export default function expand(
  style: Record<string, string | number>,
  inheritedStyle: Record<string, string | number>
): Record<string, string | number> {
  const transformedStyle = {} as any
  for (const prop in style) {
    // Internal properties.
    if (prop.startsWith('_')) {
      transformedStyle[prop] = style[prop]
      continue
    }

    const name = getPropertyName(prop)
    Object.assign(
      transformedStyle,
      handleSpecialCase(name, style[prop]) ||
        handleFallbackColor(
          name,
          getStylesForProperty(name, purify(name, style[prop]), true),
          style[prop] as string,
          (style.color || inheritedStyle.color) as string
        )
    )
  }

  // Parse background images.
  if (transformedStyle.backgroundImage) {
    const { backgrounds } = parseElementStyle(transformedStyle)
    transformedStyle.backgroundImage = backgrounds
  }

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
  if (typeof transformedStyle.fontSize !== 'undefined') {
    transformedStyle.fontSize = baseFontSize
  }

  if (transformedStyle.transformOrigin) {
    transformedStyle.transformOrigin = parseTransformOrigin(
      transformedStyle.transformOrigin,
      baseFontSize
    )
  }

  for (const prop in transformedStyle) {
    let value = transformedStyle[prop]

    // Line height needs to be relative.
    if (prop === 'lineHeight') {
      if (typeof value === 'string') {
        value = transformedStyle[prop] =
          lengthToNumber(value, baseFontSize, inheritedStyle, {
            percentage: true,
          }) / baseFontSize
      }
    } else {
      // Convert em and rem values to px (number).
      if (typeof value === 'string') {
        const len = lengthToNumber(value, baseFontSize, inheritedStyle)
        if (typeof len !== 'undefined') transformedStyle[prop] = len
        value = transformedStyle[prop]
      }
    }

    // Inherit the opacity.
    if (prop === 'opacity') {
      value = transformedStyle[prop] =
        value * (inheritedStyle.opacity as number)
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
      for (const transform of transforms) {
        const type = Object.keys(transform)[0]
        const v = transform[type]
        const len =
          typeof v === 'string'
            ? lengthToNumber(v, baseFontSize, inheritedStyle)
            : v

        const transformMatrix = [...baseMatrix]
        switch (type) {
          case 'translateX':
            transformMatrix[4] = len
            break
          case 'translateY':
            transformMatrix[5] = len
            break
          case 'scale':
            transformMatrix[0] = len
            transformMatrix[3] = len
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
        matrix = multiply(transformMatrix, matrix)
      }

      transformedStyle.transform = matrix
    }
  }

  return transformedStyle
}
