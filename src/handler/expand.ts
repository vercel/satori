/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import { getPropertyName, getStylesForProperty } from 'css-to-react-native'
import { parseElementStyle } from 'css-background-parser'
import { parse as parseBoxShadow } from 'css-box-shadow'

import CssDimension from '../vendor/parse-css-dimension'
import parseTransformOrigin from '../transform-origin'
import { lengthToNumber, v } from '../utils'

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

function handleFallbackColor(
  prop: string,
  parsed: Record<string, string>,
  rawInput: string,
  currentColor: string
) {
  if (
    prop === 'textDecoration' &&
    !rawInput.includes(parsed.textDecorationColor)
  ) {
    parsed.textDecorationColor = currentColor
  }
  return parsed
}

function purify(name: string, value?: string | number) {
  if (typeof value === 'number') {
    if (!optOutPx.has(name)) return value + 'px'
    if (keepNumber.has(name)) return value
    return String(value)
  }
  return value
}

function handleSpecialCase(
  name: string,
  value: string | number,
  currentColor: string
) {
  if (name === 'lineHeight') {
    return { lineHeight: purify(name, value) }
  }

  if (name === 'fontFamily') {
    return {
      fontFamily: (value as string).split(',').map((v) => {
        return v
          .trim()
          .replace(/(^['"])|(['"]$)/g, '')
          .toLocaleLowerCase()
      }),
    }
  }

  if (name === 'borderRadius') {
    if (typeof value !== 'string' || !value.includes('/')) {
      // Regular border radius
      return
    }
    // Support the `border-radius: 10px / 20px` syntax.
    const [horizontal, vertical] = value.split('/')
    const vh = getStylesForProperty(name, horizontal, true)
    const vv = getStylesForProperty(name, vertical, true)
    for (const k in vh) {
      vv[k] = purify(name, vh[k]) + ' ' + purify(name, vv[k])
    }
    return vv
  }

  if (/^border(Top|Right|Bottom|Left)?$/.test(name)) {
    const resolved = getStylesForProperty('border', value, true)

    // Border width should be default to 3px (medium) instead of 1px:
    // https://w3c.github.io/csswg-drafts/css-backgrounds-3/#border-width
    // Although on Chrome it will be displayed as 1.5px but let's stick to the
    // spec.
    if (resolved.borderWidth === 1 && !String(value).includes('1px')) {
      resolved.borderWidth = 3
    }

    // A trick to fix `border: 1px solid` to not use `black` but the inherited
    // `color` value. This is necessary because css-to-react-native automatically
    // fallbacks to default color values.
    if (resolved.borderColor === 'black' && !String(value).includes('black')) {
      resolved.borderColor = currentColor
    }

    const purified = {
      Width: purify(name + 'Width', resolved.borderWidth),
      Style: v(
        resolved.borderStyle,
        {
          solid: 'solid',
          dashed: 'dashed',
        },
        'solid',
        name + 'Style'
      ),
      Color: resolved.borderColor,
    }

    const full = {}
    for (const k of name === 'border'
      ? ['Top', 'Right', 'Bottom', 'Left']
      : [name.slice(6)]) {
      for (const p in purified) {
        full['border' + k + p] = purified[p]
      }
    }
    return full
  }

  if (name === 'boxShadow') {
    if (!value) {
      throw new Error('Invalid `boxShadow` value: "' + value + '".')
    }
    return {
      [name]: typeof value === 'string' ? parseBoxShadow(value) : value,
    }
  }

  if (name === 'transform') {
    if (typeof value !== 'string') throw new Error('Invalid `transform` value.')
    // To support percentages in transform (which is not supported in RN), we
    // replace them with random symbols and then replace them back after parsing.
    const symbols = {}
    const replaced = value.replace(/(-?[\d.]+%)/g, (_, v) => {
      const symbol = ~~(Math.random() * 1e9)
      symbols[symbol] = v
      return symbol + 'px'
    })
    const parsed = getStylesForProperty('transform', replaced, true)
    for (const t of parsed.transform) {
      for (const k in t) {
        if (symbols[t[k]]) {
          t[k] = symbols[t[k]]
        }
      }
    }
    return parsed
  }

  if (name === 'background') {
    value = value.toString().trim()
    if (/^(linear-gradient|radial-gradient|url)\(/.test(value)) {
      return getStylesForProperty('backgroundImage', value, true)
    }
    return getStylesForProperty('background', value, true)
  }

  return
}

function getErrorHint(name: string) {
  if (name === 'transform') {
    return ' Only absolute lengths such as `10px` are supported.'
  }
  return ''
}

const RGB_SLASH = /rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\.\d]+)\)/
function normalizeColor(value: string | object) {
  if (typeof value === 'string') {
    if (RGB_SLASH.test(value.trim())) {
      // rgb(255 122 127 / .2) -> rgba(255, 122, 127, .2)
      return value.trim().replace(RGB_SLASH, (_, r, g, b, a) => {
        return `rgba(${r}, ${g}, ${b}, ${a})`
      })
    }
  }

  // Recursively normalize colors in arrays and objects.
  if (typeof value === 'object' && value !== null) {
    for (const k in value) {
      value[k] = normalizeColor(value[k])
    }
    return value
  }

  return value
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
    const currentColor = (style.color || inheritedStyle.color) as string

    try {
      const resolvedStyle =
        handleSpecialCase(name, style[prop], currentColor) ||
        handleFallbackColor(
          name,
          getStylesForProperty(name, purify(name, style[prop]), true),
          style[prop] as string,
          currentColor
        )

      Object.assign(transformedStyle, resolvedStyle)
    } catch (err) {
      throw new Error(
        err.message +
          // Attach the extra information of the rule itself if it's not included in
          // the error message.
          (err.message.includes(style[prop])
            ? '\n  ' + getErrorHint(name)
            : `\n  in CSS rule \`${name}: ${style[prop]}\`.${getErrorHint(
                name
              )}`)
      )
    }
  }

  // Parse background images.
  if (transformedStyle.backgroundImage) {
    const { backgrounds } = parseElementStyle(transformedStyle)
    transformedStyle.backgroundImage = backgrounds
  }

  // Calculate the base font size.
  let baseFontSize: number =
    typeof transformedStyle.fontSize === 'number'
      ? transformedStyle.fontSize
      : inheritedStyle.fontSize
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
          lengthToNumber(
            value,
            baseFontSize,
            baseFontSize,
            inheritedStyle,
            true
          ) / baseFontSize
      }
    } else {
      // Convert em and rem values to px (number).
      if (typeof value === 'string') {
        const len = lengthToNumber(
          value,
          baseFontSize,
          baseFontSize,
          inheritedStyle
        )
        if (typeof len !== 'undefined') transformedStyle[prop] = len
        value = transformedStyle[prop]
      }

      if (typeof value === 'string' || typeof value === 'object') {
        const color = normalizeColor(value)
        if (color) transformedStyle[prop] = color
        value = transformedStyle[prop]
      }
    }

    // Inherit the opacity.
    if (prop === 'opacity') {
      value = transformedStyle[prop] =
        value * (inheritedStyle.opacity as number)
    }

    if (prop === 'transform') {
      const transforms = value as { [type: string]: number | string }[]

      for (const transform of transforms) {
        const type = Object.keys(transform)[0]
        const v = transform[type]

        // Convert em, rem, vw, vh values to px (number), but keep % values.
        const len =
          typeof v === 'string'
            ? lengthToNumber(v, baseFontSize, baseFontSize, inheritedStyle) ?? v
            : v
        transform[type] = len
      }
    }
  }

  return transformedStyle
}
