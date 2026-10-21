/**
 * Parses the `font` shorthand into the longhands it sets. Like in browsers,
 * the longhands that aren't given are reset.
 * https://drafts.csswg.org/css-fonts-4/#font-prop
 */

const STRETCH = new Set([
  'ultra-condensed',
  'extra-condensed',
  'condensed',
  'semi-condensed',
  'semi-expanded',
  'expanded',
  'extra-expanded',
  'ultra-expanded',
])

const SIZE_KEYWORDS = new Set([
  'xx-small',
  'x-small',
  'small',
  'medium',
  'large',
  'x-large',
  'xx-large',
  'xxx-large',
  'larger',
  'smaller',
  'math',
])

const NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i
const LENGTH = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:[a-z]+|%)$/i
const MATH = /^(?:calc|min|max|clamp)\(/i
const ANGLE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:deg|grad|rad|turn)$/i

/**
 * Reads a component of the value from `start`, until whitespace or `/`
 * outside of functions and strings. Returns where it ends.
 */
function readComponent(value: string, start: number) {
  let depth = 0
  let quote = ''
  let i = start
  for (; i < value.length; i++) {
    const char = value[i]
    if (quote) {
      if (char === '\\') i++
      else if (char === quote) quote = ''
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === '(') {
      depth++
    } else if (char === ')') {
      depth = Math.max(depth - 1, 0)
    } else if (!depth && (char === '/' || /\s/.test(char))) {
      break
    }
  }
  return i
}

function skipWhitespace(value: string, start: number) {
  let i = start
  while (i < value.length && /\s/.test(value[i])) i++
  return i
}

function isSize(component: string) {
  const lower = component.toLowerCase()
  return (
    SIZE_KEYWORDS.has(lower) ||
    LENGTH.test(component) ||
    component === '0' ||
    MATH.test(component)
  )
}

export function parseFontShorthand(value: string): Record<string, string> {
  const invalid = () =>
    new Error(`Invalid value for CSS property "font": "${value}".`)
  let style: string | undefined
  let variant: string | undefined
  let weight: string | undefined
  let stretch: string | undefined

  let i = skipWhitespace(value, 0)
  let size: string | undefined
  // Up to four keywords of the style, variant, weight and width come first,
  // in any order, and `normal` for any of them.
  for (let count = 0; i < value.length; ) {
    const end = readComponent(value, i)
    const component = value.slice(i, end)
    const lower = component.toLowerCase()
    if (count < 4 && !isSize(component) && value[end] !== '/') {
      let next = skipWhitespace(value, end)
      if (lower === 'normal') {
        // Sets nothing that isn't reset.
      } else if (!style && (lower === 'italic' || lower === 'oblique')) {
        style = lower
        // `oblique` can be followed by an angle.
        const angleEnd = readComponent(value, next)
        const angle = value.slice(next, angleEnd)
        if (lower === 'oblique' && ANGLE.test(angle)) {
          style += ' ' + angle
          next = skipWhitespace(value, angleEnd)
        }
      } else if (!variant && lower === 'small-caps') {
        variant = lower
      } else if (
        !weight &&
        (lower === 'bold' ||
          lower === 'bolder' ||
          lower === 'lighter' ||
          (NUMBER.test(component) &&
            Number(component) >= 1 &&
            Number(component) <= 1000))
      ) {
        weight = lower
      } else if (!stretch && STRETCH.has(lower)) {
        stretch = lower
      } else {
        throw invalid()
      }
      count++
      i = next
      continue
    }
    if (!isSize(component)) throw invalid()
    size = component
    i = end
    break
  }
  if (size === undefined) throw invalid()

  // The line height comes after a slash.
  let lineHeight = 'normal'
  i = skipWhitespace(value, i)
  if (value[i] === '/') {
    i = skipWhitespace(value, i + 1)
    const end = readComponent(value, i)
    lineHeight = value.slice(i, end)
    if (!lineHeight) throw invalid()
    i = end
  }

  // The families are the rest.
  const family = value.slice(i).trim()
  if (!family || family.startsWith('/')) throw invalid()

  return {
    fontStyle: style || 'normal',
    fontVariant: variant || 'normal',
    fontWeight: weight || 'normal',
    fontStretch: stretch || 'normal',
    fontSize: size,
    lineHeight,
    fontFamily: family,
  }
}
