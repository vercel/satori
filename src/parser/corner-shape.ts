export const cornerShapeKeywords = {
  round: 1,
  squircle: 2,
  square: Infinity,
  bevel: 0,
  scoop: -1,
  notch: -Infinity,
} as const

export function parseCornerShapeValue(value: string) {
  const normalized = value.trim().toLowerCase()
  const keyword = cornerShapeKeywords[normalized]
  if (typeof keyword !== 'undefined') return keyword

  const match = normalized.match(
    /^superellipse\(\s*(-?infinity|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?)\s*\)$/
  )
  if (!match) throw new Error('Invalid corner shape value: "' + value + '".')
  if (match[1] === 'infinity') return Infinity
  if (match[1] === '-infinity') return -Infinity

  const shape = Number(match[1])
  if (!Number.isFinite(shape)) {
    throw new Error('Invalid corner shape value: "' + value + '".')
  }
  return shape
}

export function splitCornerShapeValues(value: string, maxValues = 4) {
  const values = value.match(/superellipse\([^)]*\)|[^\s]+/gi) || []

  if (values.length < 1 || values.length > maxValues) {
    throw new Error('Invalid corner shape value: "' + value + '".')
  }

  for (const shape of values) parseCornerShapeValue(shape)
  return values
}
