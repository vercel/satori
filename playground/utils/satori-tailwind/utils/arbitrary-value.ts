const arbitraryValueRegex = new RegExp('^\\[.+\\]$')
const arbitraryNumericOnlyValueRegex = new RegExp('^\\[\\d+\\]$')
const arbitraryColorRegex = new RegExp(
  '^\\[((#[0-9a-f]{3,4})|(#[0-9a-f]{6})|(#[0-9a-f]{8})|(((rgba?)|(hsla?))\\(.+\\)))\\]$',
  'i'
)
const arbitraryLengthValueRegex = new RegExp('^\\[(\\d+|length:).+\\]$')
const arbitraryShadowValueRegex = new RegExp(
  '^\\[(inset )?(\\d+|length:).+\\]$'
)
const cssDataTypePrefix = new RegExp('^(length|color):')

export function isArbitraryValue(str: string) {
  return str.match(arbitraryValueRegex)
}

export function isArbitraryValueWithUrlPrefix(str: string) {
  return str.match(arbitraryValueRegex) && str.startsWith('[url')
}

export function isArbitraryValueWithLengthPrefix(str: string) {
  return str.match(arbitraryValueRegex) && str.startsWith('[length:')
}

export function isArbitraryShadowValue(str: string) {
  return str.match(arbitraryShadowValueRegex)
}

export function isArbitraryNumericOnlyValue(str: string) {
  return str.match(arbitraryNumericOnlyValueRegex)
}

export function isArbitraryColorValueOrWithColorPrefix(str: string) {
  return (
    str.match(arbitraryColorRegex) ||
    (str.match(arbitraryValueRegex) && str.startsWith('[color:'))
  )
}

export function isArbitraryLengthValue(str: string) {
  return str.match(arbitraryLengthValueRegex)
}

export function removeFirstAndLastChar(str: string) {
  return str.slice(1, str.length - 1)
}

export function removeCSSDataTypePrefix(str: string) {
  return str.replace(cssDataTypePrefix, '')
}

/**
 * Replace an underscore with a space, except when preceded by a backslash
 * @see https://tailwindcss.com/docs/adding-custom-styles#handling-whitespace
 */
export function replaceUnderscore(str: string) {
  return str.replace(new RegExp(`([^\\\\]|^)_`, 'g'), '$1 ')
}
