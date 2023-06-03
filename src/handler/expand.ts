/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import { getPropertyName, getStylesForProperty } from 'css-to-react-native'
import { parseElementStyle } from 'css-background-parser'
import { parse as parseBoxShadow } from 'css-box-shadow'
import cssColorParse from 'parse-css-color'

import CssDimension from '../vendor/parse-css-dimension/index.js'
import parseTransformOrigin from '../transform-origin.js'
import { isString, lengthToNumber, v } from '../utils.js'
import { parseMask } from '../parser/mask.js'

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
      fontFamily: (value as string).split(',').map((_v) => {
        return _v
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
    const replaced = value.replace(/(-?[\d.]+%)/g, (_, _v) => {
      const symbol = ~~(Math.random() * 1e9)
      symbols[symbol] = _v
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

  if (name === 'textShadow') {
    // Handle multiple text shadows if provided.
    value = value.toString().trim()
    if (value.includes(',')) {
      const shadows = splitTextShadow(value)
      const result = {}
      for (const shadow of shadows) {
        const styles = getStylesForProperty('textShadow', shadow, true)
        for (const k in styles) {
          if (!result[k]) {
            result[k] = [styles[k]]
          } else {
            result[k].push(styles[k])
          }
        }
      }
      return result
    }
  }

  return
}

function splitTextShadow(str: string) {
  const result: string[] = []
  let skip = false
  let startPos = 0
  const len = str.length

  for (let i = 0; i < len; ++i) {
    const t = str[i]
    if (t === ')') skip = false
    if (skip) continue
    if (t === '(') skip = true

    if (t === ',') {
      result.push(str.substring(startPos, i))
      startPos = i + 1
    }
  }

  result.push(str.substring(startPos, len))

  return result.map((s) => s.trim())
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
  style: Record<string, string | number> | undefined,
  inheritedStyle: Record<string, string | number>
): Record<string, string | number> {
  const transformedStyle = {} as any

  if (style) {
    const currentColor = getCurrentColor(
      style.color as string,
      inheritedStyle.color as string
    )

    transformedStyle.color = currentColor

    for (const prop in style) {
      // Internal properties.
      if (prop.startsWith('_')) {
        transformedStyle[prop] = style[prop]
        continue
      }

      if (prop === 'color') {
        continue
      }

      const name = getPropertyName(prop)
      const value = preprocess(style[prop], currentColor)

      try {
        const resolvedStyle =
          handleSpecialCase(name, value, currentColor) ||
          handleFallbackColor(
            name,
            getStylesForProperty(name, purify(name, value), true),
            value as string,
            currentColor
          )

        Object.assign(transformedStyle, resolvedStyle)
      } catch (err) {
        throw new Error(
          err.message +
            // Attach the extra information of the rule itself if it's not included in
            // the error message.
            (err.message.includes(value)
              ? '\n  ' + getErrorHint(name)
              : `\n  in CSS rule \`${name}: ${value}\`.${getErrorHint(name)}`)
        )
      }
    }
  }

  // Parse background images.
  if (transformedStyle.backgroundImage) {
    const { backgrounds } = parseElementStyle(transformedStyle)
    transformedStyle.backgroundImage = backgrounds
  }

  if (transformedStyle.maskImage || transformedStyle['WebkitMaskImage']) {
    const mask = parseMask(transformedStyle)
    transformedStyle.maskImage = mask
  }

  // Calculate the base font size.
  const baseFontSize = calcBaseFontSize(
    transformedStyle.fontSize,
    inheritedStyle.fontSize as number
  )
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
        const _v = transform[type]

        // Convert em, rem, vw, vh values to px (number), but keep % values.
        const len =
          typeof _v === 'string'
            ? lengthToNumber(_v, baseFontSize, baseFontSize, inheritedStyle) ??
              _v
            : _v
        transform[type] = len
      }
    }
  }

  return transformedStyle
}

function calcBaseFontSize(size: number | string, inheritedSize: number) {
  if (typeof size === 'number') return size

  try {
    const parsed = new CssDimension(size)
    switch (parsed.unit) {
      case 'em':
        return parsed.value * inheritedSize
      case 'rem':
        return parsed.value * 16
    }
  } catch (err) {
    return inheritedSize
  }
}

/**
 * @see https://github.com/RazrFalcon/resvg/issues/579
 */
function refineHSL(color: string) {
  if (color.startsWith('hsl')) {
    const t = cssColorParse(color)
    const [h, s, l] = t.values

    return `hsl(${[h, `${s}%`, `${l}%`]
      .concat(t.alpha === 1 ? [] : [t.alpha])
      .join(',')})`
  }

  return color
}

function getCurrentColor(color: string | undefined, inheritedColor: string) {
  if (color && color.toLowerCase() !== 'currentcolor') {
    return refineHSL(color)
  }

  return refineHSL(inheritedColor)
}

function convertCurrentColorToActualValue(
  value: string,
  currentColor: string
): string {
  return value.replace(/currentcolor/gi, currentColor)
}

function preprocess(
  value: string | number,
  currentColor: string
): string | number {
  if (isString(value)) {
    value = convertCurrentColorToActualValue(value, currentColor)
  }

  return value
}
