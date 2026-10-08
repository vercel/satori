/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import { getPropertyName, getStylesForProperty } from 'css-to-react-native'
import { parseElementStyle } from 'css-background-parser'
import { parse as parseBoxShadow } from 'css-box-shadow'
import cssColorParse from 'parse-css-color'
import valueParser from 'postcss-value-parser'

import parseTransformOrigin, {
  ParsedTransformOrigin,
} from '../transform-origin.js'
import { isString, lengthToNumber, v, splitEffects } from '../utils.js'
import { MaskProperty, parseMask } from '../parser/mask.js'
import { splitCornerShapeValues } from '../parser/corner-shape.js'
import { parseBackdropFilter } from '../parser/backdrop-filter.js'
import { expandGridPlacement } from '../parser/grid.js'
import { expandBackground } from '../parser/background.js'
import parseTransform, {
  resolveTransform,
  type TransformFunction,
} from '../parser/transform.js'
import { FontWeight, FontStyle } from '../font.js'
import {
  extractCustomProperties,
  mergeVariables,
  resolveVariables,
  CSSVariables,
} from './variables.js'

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

const TEXT_DECORATION_LINES = ['underline', 'overline', 'line-through', 'blink']
const TEXT_DECORATION_STYLES = ['solid', 'double', 'dotted', 'dashed', 'wavy']

/** `none`, or any of the lines. `blink` is valid, but not drawn. */
function parseTextDecorationLine(lines: string[]) {
  if (lines.includes('none')) {
    if (lines.length > 1) throw new Error('Invalid `textDecorationLine` value.')
    return 'none'
  }
  if (
    !lines.length ||
    new Set(lines).size !== lines.length ||
    lines.some((line) => !TEXT_DECORATION_LINES.includes(line))
  ) {
    throw new Error('Invalid `textDecorationLine` value.')
  }
  return lines.filter((line) => line !== 'blink').join(' ') || 'none'
}

/**
 * Values of `text-decoration-thickness` and `text-underline-offset`: `auto`,
 * `from-font` (only the thickness), a length or a percentage.
 */
function isTextDecorationLength(value: string) {
  return (
    value === 'auto' ||
    value === 'from-font' ||
    /^[+-]?(\d+\.?\d*|\.\d+)(px|em|rem|vw|vh|%)?$/.test(value)
  )
}

const LINE_WIDTH_KEYWORDS = { thin: '1px', medium: '3px', thick: '5px' }

/** Parses a `<line-width>`, or returns `undefined` if it isn't one. */
function parseLineWidth(value: string) {
  const normalized = value.toLowerCase()
  if (normalized in LINE_WIDTH_KEYWORDS) return LINE_WIDTH_KEYWORDS[normalized]
  if (/^\+?(\d+\.?\d*|\.\d+)$/.test(normalized)) return normalized + 'px'
  if (/^\+?(\d+\.?\d*|\.\d+)(px|em|rem|vw|vh|vmin|vmax)$/.test(normalized)) {
    return normalized
  }
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
  currentColor: string,
  inheritedStyle: SerializedStyle
) {
  if (name === 'zIndex') {
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'auto') return { zIndex: 'auto' }
    if (!/^[+-]?\d+$/.test(normalized)) {
      throw new Error(
        'Invalid `zIndex` value: "' +
          value +
          '". Expected an integer or "auto".'
      )
    }
    return { zIndex: Number(normalized) }
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

  if (name === 'cornerShape') {
    if (typeof value !== 'string') {
      throw new Error('Invalid `cornerShape` value: "' + value + '".')
    }
    const values = splitCornerShapeValues(value)
    const topLeft = values[0]
    const topRight = values[1] || topLeft
    const bottomRight = values[2] || topLeft
    const bottomLeft = values[3] || topRight

    return {
      cornerTopLeftShape: topLeft,
      cornerTopRightShape: topRight,
      cornerBottomRightShape: bottomRight,
      cornerBottomLeftShape: bottomLeft,
    }
  }

  if (/^corner(TopLeft|TopRight|BottomRight|BottomLeft)Shape$/.test(name)) {
    if (
      typeof value !== 'string' ||
      splitCornerShapeValues(value, 1).length !== 1
    ) {
      throw new Error('Invalid `' + name + '` value: "' + value + '".')
    }
    return { [name]: value }
  }

  const cornerSide = name.match(/^corner(Top|Right|Bottom|Left)Shape$/)
  if (cornerSide) {
    if (typeof value !== 'string') {
      throw new Error('Invalid `' + name + '` value: "' + value + '".')
    }
    const values = splitCornerShapeValues(value, 2)
    const first = values[0]
    const second = values[1] || first
    const properties = {
      Top: ['cornerTopLeftShape', 'cornerTopRightShape'],
      Right: ['cornerTopRightShape', 'cornerBottomRightShape'],
      Bottom: ['cornerBottomLeftShape', 'cornerBottomRightShape'],
      Left: ['cornerTopLeftShape', 'cornerBottomLeftShape'],
    }[cornerSide[1]]

    return { [properties[0]]: first, [properties[1]]: second }
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

  if (name === 'backdropFilter' || name === 'WebkitBackdropFilter') {
    return {
      _backdropFilters: parseBackdropFilter(
        value,
        inheritedStyle,
        currentColor
      ),
    }
  }

  if (name === 'transform') {
    if (typeof value !== 'string') throw new Error('Invalid `transform` value.')
    // Lengths are resolved later, once the font size is known.
    return { transform: parseTransform(value) }
  }

  if (name === 'background') {
    return expandBackground(String(value).trim())
  }

  // Parsed by `css-background-parser` as lists of strings.
  if (
    name === 'backgroundPosition' ||
    name === 'backgroundSize' ||
    name === 'backgroundRepeat' ||
    name === 'backgroundOrigin'
  ) {
    return { [name]: typeof value === 'number' ? `${value}px` : String(value) }
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
    // `<line-width> || <color>` in any order. Like other shorthands, omitted
    // values are reset to their initial values.
    const parts = valueParser(String(value))
      .nodes.filter((node) => node.type !== 'space')
      .map((node) => valueParser.stringify(node))
    let width: string | undefined
    let color: string | undefined
    for (const part of parts) {
      const lineWidth = parseLineWidth(part)
      if (lineWidth !== undefined && width === undefined) {
        width = lineWidth
      } else if (lineWidth === undefined && color === undefined) {
        color = part
      } else {
        throw new Error('Invalid `WebkitTextStroke` value.')
      }
    }
    if (!parts.length) throw new Error('Invalid `WebkitTextStroke` value.')

    return {
      WebkitTextStrokeWidth: width ?? 0,
      WebkitTextStrokeColor: color ?? currentColor,
    }
  }

  if (name === 'WebkitTextStrokeWidth') {
    const width = parseLineWidth(String(value).trim())
    if (width === undefined) {
      throw new Error('Invalid `WebkitTextStrokeWidth` value.')
    }
    return { WebkitTextStrokeWidth: width }
  }

  if (name === 'WebkitBackgroundClip') {
    return { backgroundClip: value }
  }

  if (name === 'paintOrder') {
    // `normal | [ fill || stroke || markers ]`
    const normalized = String(value).trim().toLowerCase()
    const keywords = normalized.split(/\s+/)
    if (
      normalized !== 'normal' &&
      (keywords.length > 3 ||
        new Set(keywords).size !== keywords.length ||
        keywords.some((k) => !['fill', 'stroke', 'markers'].includes(k)))
    ) {
      throw new Error('Invalid `paintOrder` value.')
    }
    // Omitted keywords are painted after the others, in the default order.
    const order = [...keywords, 'fill', 'stroke', 'markers'].filter(
      (k, i, all) => all.indexOf(k) === i
    )
    const isNormal =
      normalized === 'normal' || order.join(' ') === 'fill stroke markers'
    return { paintOrder: isNormal ? 'normal' : keywords.join(' ') }
  }

  if (name === 'mixBlendMode') {
    return {
      mixBlendMode: v(
        String(value).trim(),
        {
          normal: 'normal',
          multiply: 'multiply',
          screen: 'screen',
          overlay: 'overlay',
          darken: 'darken',
          lighten: 'lighten',
          'color-dodge': 'color-dodge',
          'color-burn': 'color-burn',
          'hard-light': 'hard-light',
          'soft-light': 'soft-light',
          difference: 'difference',
          exclusion: 'exclusion',
          hue: 'hue',
          saturation: 'saturation',
          color: 'color',
          luminosity: 'luminosity',
          'plus-lighter': 'plus-lighter',
        },
        'normal',
        'mixBlendMode'
      ),
    }
  }

  if (name === 'isolation') {
    return {
      isolation: v(
        String(value).trim(),
        { auto: 'auto', isolate: 'isolate' },
        'auto',
        'isolation'
      ),
    }
  }

  if (name === 'gap') {
    // `<row-gap> <column-gap>?`
    const [rowGap, columnGap = rowGap, ...rest] = String(value)
      .trim()
      .split(/\s+/)
    if (rest.length) throw new Error('Invalid `gap` value.')
    return {
      rowGap: purify('rowGap', rowGap),
      columnGap: purify('columnGap', columnGap),
    }
  }

  if (name === 'gridRow' || name === 'gridColumn' || name === 'gridArea') {
    return expandGridPlacement(name, value)
  }

  // Parsed by `compute()`, which resolves lengths in track lists.
  if (
    [
      'gridTemplateColumns',
      'gridTemplateRows',
      'gridTemplateAreas',
      'gridAutoColumns',
      'gridAutoRows',
      'gridAutoFlow',
      'gridRowStart',
      'gridRowEnd',
      'gridColumnStart',
      'gridColumnEnd',
    ].includes(name)
  ) {
    return { [name]: value }
  }

  if (name === 'textDecoration') {
    // `<line> || <style> || <color> || <thickness>`. Like other shorthands,
    // omitted values are reset to their initial values.
    const lines: string[] = []
    let decorationStyle: string | undefined
    let color: string | undefined
    let thickness: string | undefined
    const parts = valueParser(String(value))
      .nodes.filter((node) => node.type !== 'space')
      .map((node) => valueParser.stringify(node))
    for (const part of parts) {
      const keyword = part.toLowerCase()
      if (
        [...TEXT_DECORATION_LINES, 'none'].includes(keyword) &&
        !lines.includes(keyword)
      ) {
        lines.push(keyword)
      } else if (
        TEXT_DECORATION_STYLES.includes(keyword) &&
        decorationStyle === undefined
      ) {
        decorationStyle = keyword
      } else if (isTextDecorationLength(keyword) && thickness === undefined) {
        thickness = keyword
      } else if (color === undefined && cssColorParse(part)) {
        color = part
      } else {
        throw new Error('Invalid `textDecoration` value.')
      }
    }
    return {
      // Without a line, e.g. `red` or `wavy blue`, it's reset to `none`.
      textDecorationLine: lines.length
        ? parseTextDecorationLine(lines)
        : 'none',
      textDecorationStyle: decorationStyle ?? 'solid',
      textDecorationColor: color ?? currentColor,
      textDecorationThickness: thickness ?? 'auto',
    }
  }

  if (name === 'textDecorationLine') {
    return {
      textDecorationLine: parseTextDecorationLine(
        String(value).trim().toLowerCase().split(/\s+/)
      ),
    }
  }

  if (name === 'textDecorationStyle') {
    return {
      textDecorationStyle: v(
        String(value).trim().toLowerCase(),
        Object.fromEntries(TEXT_DECORATION_STYLES.map((s) => [s, s])),
        'solid',
        'textDecorationStyle'
      ),
    }
  }

  if (name === 'textDecorationThickness' || name === 'textUnderlineOffset') {
    const normalized = purify(name, String(value).trim().toLowerCase())
    if (
      !isTextDecorationLength(String(normalized)) ||
      (name === 'textUnderlineOffset' && normalized === 'from-font')
    ) {
      throw new Error(`Invalid \`${name}\` value.`)
    }
    return { [name]: normalized }
  }

  if (name === 'textDecorationSkipInk') {
    const normalized = value.toString().trim().toLowerCase()
    if (!['auto', 'none', 'all'].includes(normalized)) {
      throw new Error('Invalid `textDecorationSkipInk` value.')
    }

    return { textDecorationSkipInk: normalized }
  }

  return
}

function getErrorHint(name: string) {
  if (name === 'transform') {
    return ' `calc()` is not supported in transform functions.'
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
  textIndent: number | string
  lineHeight: number | string
  letterSpacing: number

  fontFamily: string | string[]
  fontWeight: FontWeight
  fontStyle: FontStyle
  fontFeatureSettings: string

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
  WebkitTextFillColor: string
  paintOrder: string
  textDecorationSkipInk: 'auto' | 'none' | 'all'
}

type OtherStyle = Exclude<Record<PropertyKey, string | number>, keyof MainStyle>

export type SerializedStyle = Partial<MainStyle & OtherStyle>

export default function expand(
  style: Record<string, string | number> | undefined,
  inheritedStyle: SerializedStyle
): SerializedStyle {
  const serializedStyle: SerializedStyle = {}

  // Extract inherited CSS variables
  const inheritedVariables: CSSVariables = {}
  for (const prop in inheritedStyle) {
    if (prop.startsWith('--')) {
      inheritedVariables[prop] = String(inheritedStyle[prop])
    }
  }

  // Extract and resolve CSS variables from current style
  let currentVariables: CSSVariables = {}
  let processableStyle = style

  if (style) {
    const { variables, remainingStyle } = extractCustomProperties(style)
    currentVariables = variables
    processableStyle = remainingStyle
  }

  // Merge variables (current overrides inherited)
  const mergedVariables = mergeVariables(inheritedVariables, currentVariables)

  // Store merged variables in the serialized style for inheritance
  for (const varName in mergedVariables) {
    serializedStyle[varName] = mergedVariables[varName]
  }

  if (processableStyle) {
    // Resolve CSS variables in color property before processing
    const resolvedColor = processableStyle.color
      ? resolveVariables(processableStyle.color, mergedVariables)
      : undefined

    const currentColor = getCurrentColor(
      resolvedColor as string,
      inheritedStyle.color
    )

    serializedStyle.color = currentColor

    for (const prop in processableStyle) {
      if (prop.startsWith('_')) {
        throw new Error(`Invalid style property: ${JSON.stringify(prop)}`)
      }

      if (prop === 'color') {
        continue
      }

      const name = getPropertyName(prop)
      // Resolve CSS variables before preprocessing
      const resolvedValue = resolveVariables(
        processableStyle[prop],
        mergedVariables
      )
      const value = normalizeColorKeywords(
        name,
        preprocess(resolvedValue, currentColor)
      )

      try {
        const resolvedStyle =
          handleSpecialCase(name, value, currentColor, inheritedStyle) ||
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
    inheritedStyle.fontSize as number,
    inheritedStyle
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

  if (serializedStyle.perspectiveOrigin) {
    serializedStyle.perspectiveOrigin = parseTransformOrigin(
      serializedStyle.perspectiveOrigin as any,
      baseFontSize
    ) as any
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

    if (prop === 'opacity' && typeof value === 'number') {
      serializedStyle.opacity = Math.min(Math.max(value, 0), 1)
    }

    if (prop === 'transform') {
      // Convert em, rem, vw, vh values to px (number), but keep % values.
      serializedStyle.transform = resolveTransform(
        value as unknown as TransformFunction[],
        (length) =>
          lengthToNumber(length, baseFontSize, baseFontSize, inheritedStyle)
      ) as any
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

// https://www.w3.org/TR/css-fonts-4/#absolute-size-mapping
const ABSOLUTE_FONT_SIZES: Record<string, number> = {
  'xx-small': 9,
  'x-small': 10,
  small: 13,
  medium: 16,
  large: 18,
  'x-large': 24,
  'xx-large': 32,
  'xxx-large': 48,
}

function calcBaseFontSize(
  size: number | string | undefined,
  inheritedSize: number,
  inheritedStyle: Record<string, string | number>
): number {
  if (typeof size === 'number') return size
  if (typeof size !== 'string') return inheritedSize

  const keyword = size.trim().toLowerCase()
  if (keyword in ABSOLUTE_FONT_SIZES) return ABSOLUTE_FONT_SIZES[keyword]
  // Relative sizes scale by 1.2: https://www.w3.org/TR/css-fonts-4/#relative-size-value
  if (keyword === 'larger') return inheritedSize * 1.2
  if (keyword === 'smaller') return inheritedSize / 1.2

  // `em` and percentages are relative to the inherited font size.
  return (
    lengthToNumber(size, inheritedSize, inheritedSize, inheritedStyle, true) ??
    inheritedSize
  )
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

const COLOR_PROPERTY =
  /^(color|background|textShadow|boxShadow|textDecoration|WebkitTextStroke|border(Top|Right|Bottom|Left)?)$|Color$/
const COLOR_ALIASES = { cyan: 'aqua', magenta: 'fuchsia' }

/**
 * Color keywords are case-insensitive, and some aren't supported by
 * `css-to-react-native`, so they're lowercased and aliased in values with
 * colors.
 */
function normalizeColorKeywords(name: string, value: string | number) {
  if (typeof value !== 'string' || !COLOR_PROPERTY.test(name)) return value
  const parsed = valueParser(value)
  let changed = false
  parsed.walk((node) => {
    if (node.type === 'function' && node.value.toLowerCase() === 'url') {
      return false
    }
    if (node.type !== 'word' || !/^[a-z]+$/i.test(node.value)) return
    const lower = node.value.toLowerCase()
    const keyword = COLOR_ALIASES[lower] ?? lower
    if (
      keyword !== node.value &&
      (COLOR_ALIASES[lower] || lower === 'transparent' || cssColorParse(lower))
    ) {
      node.value = keyword
      changed = true
    }
  })
  return changed ? parsed.toString() : value
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
