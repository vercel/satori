/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import { getPropertyName, getStylesForProperty } from 'css-to-react-native'
import { parseElementStyle } from 'css-background-parser'
import { parse as parseBoxShadow } from 'css-box-shadow'
import cssColorParse from 'parse-css-color'

import CssDimension from '../vendor/parse-css-dimension/index.js'
import parseTransformOrigin, {
  ParsedTransformOrigin,
} from '../transform-origin.js'
import { isString, lengthToNumber, v, splitEffects } from '../utils.js'
import { MaskProperty, parseMask } from '../parser/mask.js'
import { FontWeight, FontStyle } from '../font.js'

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
  const num = Number(value)
  if (isNaN(num)) return value
  if (!optOutPx.has(name)) return num + 'px'
  if (keepNumber.has(name)) return num
  return String(value)
}

function handleSpecialCase(
  name: string,
  value: string | number,
  currentColor: string
) {
  if (name === 'zIndex') {
    console.warn(
      '`z-index` is currently not supported.'
    )
    return { [name]: value }
  }

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
    if (
      /^(linear-gradient|radial-gradient|url|repeating-linear-gradient)\(/.test(
        value
      )
    ) {
      return getStylesForProperty('backgroundImage', value, true)
    }
    return getStylesForProperty('background', value, true)
  }

  if (name === 'textShadow') {
    // Handle multiple text shadows if provided.
    value = value.toString().trim()
    const result = {}

    const shadows = splitEffects(value)

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

  if (name === 'WebkitTextStroke') {
    value = value.toString().trim()
    const values = value.split(' ')
    if (values.length !== 2) {
      throw new Error('Invalid `WebkitTextStroke` value.')
    }

    return {
      WebkitTextStrokeWidth: purify(name, values[0]),
      WebkitTextStrokeColor: purify(name, values[1]),
    }
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

type MainStyle = {
  color: string
  fontSize: number
  transformOrigin: ParsedTransformOrigin
  maskImage: MaskProperty[]
  opacity: number
  textTransform: string
  whiteSpace: string
  wordBreak: string
  textAlign: string
  lineHeight: number | string
  letterSpacing: number

  fontFamily: string | string[]
  fontWeight: FontWeight
  fontStyle: FontStyle

  borderTopWidth: number
  borderLeftWidth: number
  borderRightWidth: number
  borderBottomWidth: number

  paddingTop: number
  paddingLeft: number
  paddingRight: number
  paddingBottom: number

  flexGrow: number
  flexShrink: number

  gap: number
  rowGap: number
  columnGap: number

  textShadowOffset: {
    width: number
    height: number
  }[]
  textShadowColor: string[]
  textShadowRadius: number[]
  WebkitTextStrokeWidth: number
  WebkitTextStrokeColor: string
}

type OtherStyle = Exclude<Record<PropertyKey, string | number>, keyof MainStyle>

export type SerializedStyle = Partial<MainStyle & OtherStyle>

export default function expand(
  style: Record<string, string | number> | undefined,
  inheritedStyle: SerializedStyle
): SerializedStyle {
  const serializedStyle: SerializedStyle = {}

  if (style) {
    const currentColor = getCurrentColor(
      style.color as string,
      inheritedStyle.color
    )

    serializedStyle.color = currentColor

    for (const prop in style) {
      // Internal properties.
      if (prop.startsWith('_')) {
        serializedStyle[prop] = style[prop]
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

        Object.assign(serializedStyle, resolvedStyle)
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
  if (serializedStyle.backgroundImage) {
    const { backgrounds } = parseElementStyle(serializedStyle)
    serializedStyle.backgroundImage = backgrounds
  }

  if (serializedStyle.maskImage || serializedStyle['WebkitMaskImage']) {
    serializedStyle.maskImage = parseMask(serializedStyle)
  }

  // Calculate the base font size.
  const baseFontSize = calcBaseFontSize(
    serializedStyle.fontSize,
    inheritedStyle.fontSize
  )
  if (typeof serializedStyle.fontSize !== 'undefined') {
    serializedStyle.fontSize = baseFontSize
  }

  if (serializedStyle.transformOrigin) {
    serializedStyle.transformOrigin = parseTransformOrigin(
      serializedStyle.transformOrigin as any,
      baseFontSize
    )
  }

  for (const prop in serializedStyle) {
    let value = serializedStyle[prop]

    // Line height needs to be relative.
    if (prop === 'lineHeight') {
      if (typeof value === 'string' && value !== 'normal') {
        value = serializedStyle[prop] =
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
        if (typeof len !== 'undefined') serializedStyle[prop] = len
        value = serializedStyle[prop]
      }

      if (typeof value === 'string' || typeof value === 'object') {
        const color = normalizeColor(value)
        if (color) {
          serializedStyle[prop] = color as any
        }
        value = serializedStyle[prop]
      }
    }

    // Inherit the opacity.
    if (prop === 'opacity' && typeof value === 'number') {
      serializedStyle.opacity = value * inheritedStyle.opacity
    }

    if (prop === 'transform') {
      const transforms = value as any as { [type: string]: number | string }[]

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

    if (prop === 'textShadowRadius') {
      const textShadowRadius = value as unknown as Array<number | string>

      serializedStyle.textShadowRadius = textShadowRadius.map((_v) =>
        lengthToNumber(_v, baseFontSize, 0, inheritedStyle, false)
      )
    }

    if (prop === 'textShadowOffset') {
      const textShadowOffset = value as unknown as Array<{
        width: number | string
        height: number | string
      }>

      serializedStyle.textShadowOffset = textShadowOffset.map(
        ({ height, width }) => ({
          height: lengthToNumber(
            height,
            baseFontSize,
            0,
            inheritedStyle,
            false
          ),
          width: lengthToNumber(width, baseFontSize, 0, inheritedStyle, false),
        })
      )
    }
  }

  return serializedStyle
}

function calcBaseFontSize(
  size: number | string,
  inheritedSize: number
): number {
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

function getCurrentColor(
  color: string | undefined,
  inheritedColor: string
): string {
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
