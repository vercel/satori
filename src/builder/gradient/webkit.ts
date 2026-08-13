const DIRECTION_KEYWORDS = new Set(['left', 'right', 'top', 'bottom'])
const DIRECTION_FLIP: Record<string, string> = {
  left: 'right',
  right: 'left',
  top: 'bottom',
  bottom: 'top',
}

const POSITION_KEYWORDS = new Set(['center', 'left', 'right', 'top', 'bottom'])

const SHAPE_SIZE_KEYWORDS = new Set([
  'circle',
  'ellipse',
  'closest-side',
  'closest-corner',
  'farthest-side',
  'farthest-corner',
  'contain',
  'cover',
])

const WEBKIT_SIZE_ALIASES: Record<string, string> = {
  contain: 'closest-side',
  cover: 'farthest-corner',
}

const LENGTH_RE = /^-?\d+(\.\d+)?(%|px|em|rem|vw|vh)$/
const ANGLE_RE = /^(-?\d+\.?\d*)(deg|rad|grad|turn)$/

function splitTopLevelCommas(str: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '(') depth++
    else if (str[i] === ')') depth--
    else if (str[i] === ',' && depth === 0) {
      parts.push(str.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(str.slice(start).trim())
  return parts
}

function isDirectionKeywords(arg: string): boolean {
  const tokens = arg.trim().split(/\s+/)
  return tokens.length > 0 && tokens.every((t) => DIRECTION_KEYWORDS.has(t))
}

function toDegrees(value: number, unit: string): number {
  switch (unit) {
    case 'deg':
      return value
    case 'rad':
      return (value * 180) / Math.PI
    case 'turn':
      return value * 360
    case 'grad':
      return value * 0.9
    default:
      return value
  }
}

function convertLinearArgs(content: string): string {
  const parts = splitTopLevelCommas(content)
  const first = parts[0].trim()

  if (isDirectionKeywords(first)) {
    const flipped = first
      .split(/\s+/)
      .map((w) => DIRECTION_FLIP[w])
      .join(' ')
    parts[0] = 'to ' + flipped
    return parts.join(', ')
  }

  const angleMatch = first.match(ANGLE_RE)
  if (angleMatch) {
    const deg = toDegrees(parseFloat(angleMatch[1]), angleMatch[2])
    parts[0] = `${90 - deg}deg`
    return parts.join(', ')
  }

  return content
}

function isPosition(arg: string): boolean {
  const tokens = arg.trim().split(/\s+/)
  return (
    tokens.length > 0 &&
    tokens.every((t) => POSITION_KEYWORDS.has(t) || LENGTH_RE.test(t))
  )
}

function isShapeOrSize(arg: string): boolean {
  const tokens = arg.trim().split(/\s+/)
  if (tokens.some((t) => SHAPE_SIZE_KEYWORDS.has(t))) return true
  if (tokens.every((t) => LENGTH_RE.test(t)) && tokens.length <= 2) return true
  return false
}

function replaceWebkitSizeAliases(shapeSize: string): string {
  return shapeSize
    .split(/\s+/)
    .map((t) => WEBKIT_SIZE_ALIASES[t] || t)
    .join(' ')
}

function convertRadialArgs(content: string): string {
  const parts = splitTopLevelCommas(content)
  const first = parts[0].trim()

  if (isPosition(first)) {
    if (parts.length > 1 && isShapeOrSize(parts[1].trim())) {
      const position = first
      const shapeSize = replaceWebkitSizeAliases(parts[1].trim())
      const rest = parts.slice(2)
      return `${shapeSize} at ${position}, ${rest.join(', ')}`
    }
    const rest = parts.slice(1)
    return `at ${first}, ${rest.join(', ')}`
  }

  if (isShapeOrSize(first)) {
    parts[0] = replaceWebkitSizeAliases(first)
    return parts.join(', ')
  }

  return content
}

export function normalizeWebkitGradient(image: string): string {
  const match = image.match(
    /^-webkit-(repeating-)?(linear|radial)-gradient\((.+)\)$/
  )
  if (!match) return image

  const repeating = match[1] || ''
  const type = match[2]
  const content = match[3]

  const converted =
    type === 'linear' ? convertLinearArgs(content) : convertRadialArgs(content)

  return `${repeating}${type}-gradient(${converted})`
}
