/**
 * This module expands the CSS properties to get rid of shorthands, as well as
 * cleaning up some properties.
 */

import { getPropertyName, getStylesForProperty } from 'css-to-react-native'
import { parseElementStyle } from 'css-background-parser'
import { parse as parseBoxShadow } from 'css-box-shadow'
import cssColorParse from 'parse-css-color'
import {
  convertColors as convertColorValues,
  isColor,
} from '../parser/color.js'
import valueParser from 'postcss-value-parser'

import parseTransformOrigin, {
  ParsedTransformOrigin,
} from '../transform-origin.js'
import { isString, lengthToNumber, v, splitEffects } from '../utils.js'
import { expandFontVariant, parseFontVariant } from '../text/font-features.js'
import { MaskProperty, parseMask } from '../parser/mask.js'
import { splitCornerShapeValues } from '../parser/corner-shape.js'
import { parseBackdropFilter } from '../parser/backdrop-filter.js'
import {
  expandGrid,
  expandGridPlacement,
  expandGridTemplate,
} from '../parser/grid.js'
import { expandBackground } from '../parser/background.js'
import parseTransform, {
  resolveTransform,
  type TransformFunction,
} from '../parser/transform.js'
import { FontWeight, FontStyle } from '../font.js'
import { MATH_FUNCTION, parseMath } from '../parser/math.js'
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

const BORDER_STYLES = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
])
const OUTLINE_STYLES = new Set([
  ...[...BORDER_STYLES].filter((style) => style !== 'hidden'),
  'auto',
])

function checkLineWidth(value: string | number) {
  if (typeof value === 'number') {
    if (value < 0) throw new Error(`Invalid line width: "${value}".`)
    return value + 'px'
  }
  const width = parseLineWidth(value) ?? (MATH_FUNCTION.test(value) && value)
  if (!width) throw new Error(`Invalid line width: "${value}".`)
  return width
}

function checkLineStyle(value: string | number, styles: Set<string>) {
  const style = String(value).trim().toLowerCase()
  if (!styles.has(style)) throw new Error(`Invalid line style: "${value}".`)
  return style
}

/**
 * Parses `<line-width> || <line-style> || <color>`, the values of `border` and
 * `outline` in any order.
 */
function parseLineShorthand(value: string | number, styles: Set<string>) {
  if (typeof value === 'number') return { width: checkLineWidth(value) }
  let width: string | undefined
  let style: string | undefined
  let color: string | undefined
  for (const token of splitValues(value)) {
    const lower = token.toLowerCase()
    const lineWidth =
      parseLineWidth(token) ?? (MATH_FUNCTION.test(token) && token)
    if (width === undefined && lineWidth) {
      width = lineWidth
    } else if (style === undefined && styles.has(lower)) {
      style = lower
    } else if (color === undefined && isColor(token)) {
      color = token
    } else {
      throw new Error(`Invalid value: "${value}".`)
    }
  }
  return { width, style, color }
}

function purify(name: string, value?: string | number) {
  const num = Number(value)
  if (isNaN(num)) return value
  if (!optOutPx.has(name)) return num + 'px'
  if (keepNumber.has(name)) return num
  return String(value)
}

/** Splits a value at the spaces that aren't in parentheses. */
/** A counter of `counter-reset`, `counter-increment` or `counter-set`. */
export interface CounterChange {
  name: string
  /** Omitted for `reversed()` counters without a value. */
  value?: number
  reversed?: boolean
}

/**
 * Parses `none` or `[<counter-name> <integer>?]+`, where `counter-reset` also
 * accepts `reversed(<counter-name>)`.
 */
function parseCounters(
  name: 'counterReset' | 'counterIncrement' | 'counterSet',
  value: string | number
): CounterChange[] {
  const tokens = String(value).trim().split(/\s+/)
  if (tokens.length === 1 && tokens[0].toLowerCase() === 'none') return []
  const counters: CounterChange[] = []
  const invalid = () => {
    throw new Error(`Invalid \`${name}\` value: "${value}".`)
  }
  // Whether the last counter can be followed by its value.
  let canTakeValue = false
  for (const token of tokens) {
    const reversed = /^reversed\(\s*([^()\s]+)\s*\)$/i.exec(token)
    if (/^[+-]?\d+$/.test(token)) {
      if (!canTakeValue) invalid()
      counters[counters.length - 1].value = parseInt(token, 10)
      canTakeValue = false
    } else if (reversed && name === 'counterReset') {
      counters.push({ name: reversed[1], reversed: true })
      canTakeValue = true
    } else if (/^-?[_a-zA-Z][\w-]*$/.test(token) && token !== 'none') {
      counters.push({
        name: token,
        value: name === 'counterIncrement' ? 1 : 0,
      })
      canTakeValue = true
    } else {
      invalid()
    }
  }
  return counters
}

/**
 * Parses `list-style`: a position, an image and a type in any order. `none`
 * sets the type, and the image unless one is given.
 */
function parseListStyle(value: string) {
  let position: string | undefined
  let image: string | undefined
  let type: string | undefined
  let nones = 0
  for (const token of splitValues(value.trim())) {
    const lower = token.toLowerCase()
    if (lower === 'none') nones++
    else if ((lower === 'inside' || lower === 'outside') && !position) {
      position = lower
    } else if (/^url\(/i.test(token) && !image) image = token
    else if (!type) type = token
    else throw new Error(`Invalid \`listStyle\` value: "${value}".`)
  }
  if (nones > (image ? 0 : 1) + (type ? 0 : 1)) {
    throw new Error(`Invalid \`listStyle\` value: "${value}".`)
  }
  if (nones && !type) type = 'none'
  return {
    listStylePosition: position ?? 'outside',
    listStyleImage: image ?? 'none',
    listStyleType: type ?? 'disc',
  }
}

const ANGLE = /^[+-]?(\d+\.?\d*|\.\d+)(deg|rad|grad|turn)$|^0$/i

/**
 * Parses `translate`, `rotate` and `scale` into transform functions.
 *
 * @see https://www.w3.org/TR/css-transforms-2/#individual-transforms
 */
function parseIndividualTransform(
  name: 'translate' | 'rotate' | 'scale',
  value: string | number
): TransformFunction[] {
  const invalid = () => {
    throw new Error(`Invalid \`${name}\` value: "${value}".`)
  }
  if (typeof value === 'number') {
    if (name === 'rotate' && value !== 0) invalid()
    value = name === 'translate' ? `${value}px` : String(value)
  }
  const parts = splitValues(value.trim())
  if (parts.length === 1 && parts[0].toLowerCase() === 'none') return []
  if (!parts.length) invalid()
  if (name === 'translate' || name === 'scale') {
    if (parts.length > 3) invalid()
    const fn = parts.length === 3 ? `${name}3d` : name
    return parseTransform(`${fn}(${parts.join(', ')})`)
  }
  // `[x | y | z | <number>{3}] && <angle>`
  const angleIndex = parts.findIndex((part) => ANGLE.test(part))
  if (angleIndex === -1) invalid()
  const angle = parts[angleIndex]
  const axis = parts.filter((_, i) => i !== angleIndex)
  if (axis.length === 0) return parseTransform(`rotate(${angle})`)
  if (angleIndex !== 0 && angleIndex !== parts.length - 1) invalid()
  if (axis.length === 1 && /^[xyz]$/i.test(axis[0])) {
    return parseTransform(`rotate${axis[0].toUpperCase()}(${angle})`)
  }
  if (axis.length !== 3) invalid()
  return parseTransform(`rotate3d(${axis.join(', ')}, ${angle})`)
}

function splitValues(value: string) {
  const values: string[] = []
  let depth = 0
  let current = ''
  for (const char of value.trim()) {
    if (char === '(') depth++
    if (char === ')') depth--
    if (/\s/.test(char) && depth === 0) {
      if (current) values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  if (current) values.push(current)
  return values
}

/** Expands 1 to 4 values to the top, right, bottom and left. */
function expandEdges(
  value: string | number,
  [top, right, bottom, left]: string[]
) {
  const values = typeof value === 'number' ? [value] : splitValues(value)
  if (!values.length || values.length > 4) {
    throw new Error(`Invalid value: "${value}".`)
  }
  const [t, r = t, b = t, l = r] = values
  return { [top]: t, [right]: r, [bottom]: b, [left]: l }
}

// Keywords that are combined with the next one in alignment values, e.g.
// `first baseline` and `safe center`.
const ALIGNMENT_PREFIXES = new Set(['first', 'last', 'safe', 'unsafe'])

/** Splits the values of a `place-*` shorthand. */
function splitAlignmentValues(value: string) {
  const tokens = value.trim().toLowerCase().split(/\s+/)
  const values: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    if (ALIGNMENT_PREFIXES.has(tokens[i]) && i + 1 < tokens.length) {
      values.push(tokens[i] + ' ' + tokens[++i])
    } else {
      values.push(tokens[i])
    }
  }
  if (!values[0] || values.length > 2) {
    throw new Error(`Invalid value: "${value}".`)
  }
  return values
}

const RATIO =
  /^(\d*\.?\d+(?:e[+-]?\d+)?)(?:\s*\/\s*(\d*\.?\d+(?:e[+-]?\d+)?))?$/

/**
 * Parses `aspect-ratio`: `auto`, a ratio, or both. A ratio with a zero is
 * degenerate and behaves as `auto`.
 * https://drafts.csswg.org/css-sizing-4/#aspect-ratio
 */
function parseAspectRatio(value: string | number) {
  if (typeof value === 'number') {
    if (value < 0) throw new Error(`Invalid aspect ratio: "${value}".`)
    return { aspectRatio: value > 0 ? value : 'auto' }
  }
  const tokens = value.trim().toLowerCase().split(/\s+/)
  const auto = tokens.includes('auto')
  const ratio = tokens.filter((token) => token !== 'auto').join(' ')
  if (!ratio && auto && tokens.length === 1) return { aspectRatio: 'auto' }
  const match = RATIO.exec(ratio)
  if (!match || tokens.length - (auto ? 1 : 0) > 3) {
    throw new Error(`Invalid aspect ratio: "${value}".`)
  }
  const width = Number(match[1])
  const height = match[2] === undefined ? 1 : Number(match[2])
  return {
    aspectRatio: width > 0 && height > 0 ? width / height : 'auto',
    // With `auto`, elements with a natural ratio keep it, see `compute()`.
    ...(auto ? { _aspectRatioAuto: true } : {}),
  }
}

function handleSpecialCase(
  name: string,
  value: string | number,
  currentColor: string,
  inheritedStyle: SerializedStyle
) {
  if (name === 'inset') {
    return expandEdges(value, ['top', 'right', 'bottom', 'left'])
  }

  // `place-content`, `place-items` and `place-self` set the alignment on both
  // axes. Without a second value, `justify-content` can't be `baseline`, so
  // it's `start`.
  // https://drafts.csswg.org/css-align-3/#place-content
  if (
    name === 'placeContent' ||
    name === 'placeItems' ||
    name === 'placeSelf'
  ) {
    const [align, justify] = splitAlignmentValues(String(value))
    const subject = name.slice(5)
    return {
      [`align${subject}`]: align,
      [`justify${subject}`]:
        justify ??
        (name === 'placeContent' && align.endsWith('baseline')
          ? 'start'
          : align),
    }
  }

  if (name === 'aspectRatio') {
    return parseAspectRatio(value)
  }

  // `overflow: <x> <y>`.
  if (name === 'overflow') {
    const values = splitValues(String(value))
    const keywords = { visible: 1, hidden: 1, clip: 1, scroll: 1, auto: 1 }
    if (values.length > 2) throw new Error(`Invalid value: "${value}".`)
    for (const keyword of values) v(keyword, keywords, '', 'overflow')
    const [x, y = x] = values
    return { overflowX: x, overflowY: y }
  }

  // `overflow-clip-margin: <visual-box> || <length>`.
  if (name === 'overflowClipMargin') {
    let box: string | undefined
    let margin: string | number | undefined
    for (const token of typeof value === 'number'
      ? [value]
      : splitValues(value)) {
      if (
        box === undefined &&
        ['content-box', 'padding-box', 'border-box'].includes(String(token))
      ) {
        box = String(token)
      } else if (margin === undefined) {
        margin = token
      } else {
        throw new Error(`Invalid value: "${value}".`)
      }
    }
    return {
      overflowClipMargin: margin ?? 0,
      _overflowClipBox: box ?? 'padding-box',
    }
  }

  // Shorthands with math functions, which aren't parsed by
  // css-to-react-native.
  if (typeof value === 'string' && value.includes('(')) {
    if (name === 'margin' || name === 'padding') {
      return expandEdges(value, [
        `${name}Top`,
        `${name}Right`,
        `${name}Bottom`,
        `${name}Left`,
      ])
    }
    if (name === 'gap') {
      const [rowGap, columnGap = rowGap] = splitValues(value)
      return { rowGap, columnGap }
    }
  }

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

  // `border`, `borderTop`, ... and `outline`.
  // https://drafts.csswg.org/css-backgrounds-3/#border-shorthands
  const shorthand = /^(border(Top|Right|Bottom|Left)?|outline)$/.exec(name)
  if (shorthand) {
    const isOutline = name === 'outline'
    const { width, style, color } = parseLineShorthand(
      value,
      isOutline ? OUTLINE_STYLES : BORDER_STYLES
    )
    // The initial values: a `medium` width, no style and the current color.
    const purified = {
      Width: width ?? LINE_WIDTH_KEYWORDS.medium,
      Style: style ?? 'none',
      Color: color ?? currentColor,
    }
    const full = {}
    const sides = isOutline
      ? ['outline']
      : name === 'border'
      ? ['borderTop', 'borderRight', 'borderBottom', 'borderLeft']
      : [name]
    for (const side of sides) {
      for (const p in purified) full[side + p] = purified[p]
    }
    return full
  }

  if (name === 'borderWidth' || name === 'borderStyle') {
    const property = name.slice(6)
    const sides = expandEdges(
      value,
      ['Top', 'Right', 'Bottom', 'Left'].map(
        (side) => `border${side}${property}`
      )
    )
    for (const side in sides) {
      sides[side] =
        property === 'Width'
          ? checkLineWidth(sides[side])
          : checkLineStyle(sides[side], BORDER_STYLES)
    }
    return sides
  }

  if (/^(border(Top|Right|Bottom|Left)|outline)Width$/.test(name)) {
    return { [name]: checkLineWidth(value) }
  }

  if (/^border(Top|Right|Bottom|Left)Style$/.test(name)) {
    return { [name]: checkLineStyle(value, BORDER_STYLES) }
  }

  if (name === 'outlineStyle') {
    return { [name]: checkLineStyle(value, OUTLINE_STYLES) }
  }

  if (name === 'boxShadow') {
    if (!value) {
      throw new Error('Invalid `boxShadow` value: "' + value + '".')
    }
    return {
      [name]: typeof value === 'string' ? parseBoxShadow(value) : value,
    }
  }

  if (name === 'filter') {
    return {
      filter: value,
      _filters: parseBackdropFilter(
        value,
        inheritedStyle,
        currentColor,
        'filter'
      ),
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

  if (name === 'grid' || name === 'gridTemplate') {
    if (typeof value !== 'string') throw new Error(`Invalid \`${name}\` value.`)
    return name === 'grid' ? expandGrid(value) : expandGridTemplate(value)
  }

  if (name === 'listStyle') {
    return parseListStyle(String(value))
  }

  if (name === 'listStylePosition') {
    const position = String(value).trim().toLowerCase()
    if (position !== 'inside' && position !== 'outside') {
      throw new Error(`Invalid \`listStylePosition\` value: "${value}".`)
    }
    return { listStylePosition: position }
  }

  if (
    name === 'counterReset' ||
    name === 'counterIncrement' ||
    name === 'counterSet'
  ) {
    return { [name]: parseCounters(name, value) }
  }

  if (name === 'translate' || name === 'rotate' || name === 'scale') {
    return { [name]: parseIndividualTransform(name, value) }
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

  if (name === 'fontVariant') {
    return expandFontVariant(value)
  }
  if (name === 'fontKerning' || /^fontVariant[A-Z]/.test(name)) {
    return { [name]: parseFontVariant(name, value) }
  }

  // `wordWrap` is a legacy name of `overflowWrap`.
  if (name === 'overflowWrap' || name === 'wordWrap') {
    const normalized = String(value).trim().toLowerCase()
    if (!['normal', 'break-word', 'anywhere'].includes(normalized)) {
      throw new Error(`Invalid \`${name}\` value.`)
    }
    return { overflowWrap: normalized }
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
      } else if (color === undefined && isColor(part)) {
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

// Sizes, which can be sizing keywords and `fit-content()`.
const SIZES = new Set([
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'flexBasis',
])

// Lengths that can have percentages in `calc()`.
const CALC_LENGTHS = new Set([
  'width',
  'height',
  'minWidth',
  'minHeight',
  'maxWidth',
  'maxHeight',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'top',
  'right',
  'bottom',
  'left',
  'flexBasis',
  'gap',
  'rowGap',
  'columnGap',
])

const VALID_IMAGE =
  /^(none|url\(.*\)|(repeating-)?(linear|radial|conic)-gradient\(.*\))$/is

export default function expand(
  style: Record<string, string | number> | undefined,
  inheritedStyle: SerializedStyle,
  onStyleError?: (error: Error) => void,
  convertColors = true
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
    let resolvedColor = processableStyle.color
      ? String(resolveVariables(processableStyle.color, mergedVariables))
      : undefined
    // `currentColor` in `color` is the inherited color.
    if (resolvedColor && resolvedColor.toLowerCase() !== 'currentcolor') {
      resolvedColor = convertColors
        ? convertColorValues(resolvedColor, String(inheritedStyle.color))
        : convertCurrentColorToActualValue(
            resolvedColor,
            String(inheritedStyle.color)
          )
    }

    const currentColor = getCurrentColor(resolvedColor, inheritedStyle.color)

    serializedStyle.color = currentColor

    for (const prop in processableStyle) {
      if (prop.startsWith('_')) {
        const error = new Error(
          `Invalid style property: ${JSON.stringify(prop)}`
        )
        if (!onStyleError) throw error
        onStyleError(error)
        continue
      }

      // Like in React, `undefined` and `null` values are ignored.
      if (prop === 'color' || processableStyle[prop] == null) {
        continue
      }

      const name = getPropertyName(prop)
      // Resolve CSS variables before preprocessing
      const resolvedValue = resolveVariables(
        processableStyle[prop],
        mergedVariables
      )
      // Colors are converted to be parsed. When they're kept, the converted
      // ones are replaced by the original ones afterwards.
      const kept = convertColors ? undefined : new Map<string, string>()
      const value = normalizeColorKeywords(
        name,
        preprocess(resolvedValue, currentColor, kept),
        convertColors
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

        Object.assign(
          serializedStyle,
          kept?.size ? restoreColors(resolvedStyle, kept) : resolvedStyle
        )
      } catch (err) {
        // Attach the rule itself if it's not included in the error message.
        const error = new Error(
          err.message.includes(value)
            ? err.message
            : `${err.message}\n  in CSS rule \`${name}: ${value}\`.`
        )
        if (!onStyleError) throw error
        onStyleError(error)
      }
    }
  }

  // Parse background images. A declaration with an invalid image is ignored
  // with `onStyleError`.
  const checkImages = (property: string, layers: { image: string }[]) => {
    const invalid = layers.find(({ image }) => !VALID_IMAGE.test(image.trim()))
    if (!invalid) return true
    const error = new Error(`Invalid background image: "${invalid.image}"`)
    if (!onStyleError) throw error
    onStyleError(error)
    delete serializedStyle[property]
    return false
  }
  if (serializedStyle.backgroundImage) {
    const { backgrounds } = parseElementStyle(serializedStyle)
    if (checkImages('backgroundImage', backgrounds)) {
      serializedStyle.backgroundImage = backgrounds
    }
  }

  if (serializedStyle.maskImage || serializedStyle['WebkitMaskImage']) {
    const masks = parseMask(serializedStyle)
    if (checkImages('maskImage', masks)) {
      serializedStyle.maskImage = masks
    } else {
      delete serializedStyle['WebkitMaskImage']
    }
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

  // `translate`, `rotate` and `scale` are applied before `transform`, in this
  // order.
  const individualTransforms = (
    ['translate', 'rotate', 'scale'] as const
  ).flatMap((prop) => {
    const functions = serializedStyle[prop]
    delete serializedStyle[prop]
    return Array.isArray(functions) ? functions : []
  })
  if (individualTransforms.length) {
    serializedStyle.transform = [
      ...individualTransforms,
      ...((serializedStyle.transform as unknown as TransformFunction[]) || []),
    ] as any
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
      // Math functions are resolved, except for percentages of lengths that
      // are only known in the layout.
      const math =
        typeof value === 'string' && MATH_FUNCTION.test(value)
          ? parseMath(value, (length) =>
              lengthToNumber(length, baseFontSize, 0, inheritedStyle)
            )
          : undefined
      if (math && !math.percentage) {
        value = serializedStyle[prop] = math.evaluate(0)
      } else if (math && CALC_LENGTHS.has(prop)) {
        value = serializedStyle[prop] = { calc: math.evaluate } as any
      }

      // The limit of `fit-content()` sizes is converted to px.
      const fitContent =
        typeof value === 'string' && SIZES.has(prop)
          ? /^fit-content\((.+)\)$/i.exec(value.trim())
          : null
      if (fitContent && !fitContent[1].trim().endsWith('%')) {
        const limit = lengthToNumber(
          fitContent[1].trim(),
          baseFontSize,
          baseFontSize,
          inheritedStyle
        )
        if (typeof limit === 'number') {
          value = serializedStyle[prop] = `fit-content(${limit}px)` as any
        }
      }

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
  const math = parseMath(size, (length) =>
    lengthToNumber(length, inheritedSize, 0, inheritedStyle)
  )
  if (math?.type === 'length') return math.evaluate(inheritedSize)
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
  /^(color|background|textShadow|boxShadow|textDecoration|WebkitTextStroke|border(Top|Right|Bottom|Left)?|outline)$|Color$/
const COLOR_ALIASES = { cyan: 'aqua', magenta: 'fuchsia' }

/**
 * Color keywords are case-insensitive, and some aren't supported by
 * `css-to-react-native`, so they're lowercased and aliased in values with
 * colors.
 */
function normalizeColorKeywords(
  name: string,
  value: string | number,
  convertColors: boolean
) {
  if (typeof value !== 'string' || !COLOR_PROPERTY.test(name)) return value
  const parsed = valueParser(value)
  let changed = false
  parsed.walk((node) => {
    if (node.type === 'function' && node.value.toLowerCase() === 'url') {
      return false
    }
    if (node.type !== 'word' || !/^[a-z]+$/i.test(node.value)) return
    const lower = node.value.toLowerCase()
    // `rebeccapurple` was added in CSS Color 4.
    const keyword =
      convertColors && lower === 'rebeccapurple'
        ? '#663399'
        : COLOR_ALIASES[lower] ?? lower
    if (keyword !== node.value && (COLOR_ALIASES[lower] || isColor(lower))) {
      node.value = keyword
      changed = true
    }
  })
  return changed ? parsed.toString() : value
}

function preprocess(
  value: string | number,
  currentColor: string,
  kept?: Map<string, string>
): string | number {
  if (isString(value)) {
    value = convertCurrentColorToActualValue(value, currentColor)
    value = convertColorValues(
      value,
      currentColor,
      kept && ((converted, original) => kept.set(converted, original))
    )
  }

  return value
}

/** Replaces converted colors in parsed styles by their original values. */
function restoreColors<T>(value: T, kept: Map<string, string>): T {
  if (typeof value === 'string') {
    let restored: string = value
    for (const [converted, original] of kept) {
      restored = restored.split(converted).join(original)
    }
    return restored as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => restoreColors(item, kept)) as T
  }
  if (value && typeof value === 'object') {
    const restored = {} as T
    for (const key in value) restored[key] = restoreColors(value[key], kept)
    return restored
  }
  return value
}
