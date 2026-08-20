import { calcDegree, lengthToNumber, splitEffects } from '../utils.js'

type Point = [number, number]

const horizontalKeywords: Record<string, number> = {
  left: 0,
  'x-start': 0,
  center: 0.5,
  right: 1,
  'x-end': 1,
}

const verticalKeywords: Record<string, number> = {
  top: 0,
  'y-start': 0,
  center: 0.5,
  bottom: 1,
  'y-end': 1,
}

function format(value: number) {
  return Math.round(value * 1000) / 1000
}

export function parseShapeFunction(
  value: string,
  width: number,
  height: number,
  inheritedStyle: Record<string, string | number>
) {
  const match = value.match(/^shape\((.*)\)$/s)
  if (!match) return null

  const parts = splitEffects(match[1])
  const first = parts.shift()
  if (!first) throw new Error('Invalid `shape()` value.')

  const startMatch = first.match(/^(?:(nonzero|evenodd)\s+)?from\s+(.+)$/)
  if (!startMatch) throw new Error('Invalid `shape()` starting point.')

  const fillRule = startMatch[1] || 'nonzero'
  let current = resolvePosition(
    tokenize(startMatch[2]),
    width,
    height,
    inheritedStyle
  )
  let subpathStart = current
  let path = `M${format(current[0])},${format(current[1])}`

  for (const part of parts) {
    const tokens = tokenize(part)
    const command = tokens.shift()

    if (command === 'close') {
      if (tokens.length)
        throw new Error('Invalid `close` command in `shape()`.')
      path += ' Z'
      current = subpathStart
      continue
    }

    if (command === 'move' || command === 'line') {
      const endpoint = resolveEndpoint(
        tokens,
        current,
        width,
        height,
        inheritedStyle
      )
      path += ` ${command === 'move' ? 'M' : 'L'}${format(
        endpoint[0]
      )},${format(endpoint[1])}`
      current = endpoint
      if (command === 'move') subpathStart = endpoint
      continue
    }

    if (command === 'hline' || command === 'vline') {
      const axis = command === 'hline' ? 0 : 1
      const mode = tokens.shift()
      const token = tokens.shift()
      if ((mode !== 'to' && mode !== 'by') || !token || tokens.length) {
        throw new Error(`Invalid \`${command}\` command in \`shape()\`.`)
      }
      const base = axis === 0 ? width : height
      const keywordMap = axis === 0 ? horizontalKeywords : verticalKeywords
      const resolved =
        mode === 'to' && token in keywordMap
          ? keywordMap[token] * base
          : resolveLength(token, base, inheritedStyle)
      current = [...current] as Point
      current[axis] = mode === 'by' ? current[axis] + resolved : resolved
      path += ` ${axis === 0 ? 'H' : 'V'}${format(current[axis])}`
      continue
    }

    if (command === 'curve' || command === 'smooth') {
      const withIndex = tokens.indexOf('with')
      const endpointTokens =
        withIndex === -1 ? tokens : tokens.slice(0, withIndex)
      const controlTokens = withIndex === -1 ? [] : tokens.slice(withIndex + 1)
      const mode = endpointTokens[0]
      const endpoint = resolveEndpoint(
        endpointTokens,
        current,
        width,
        height,
        inheritedStyle
      )

      if (command === 'curve' && withIndex === -1) {
        throw new Error('A `curve` command requires a control point.')
      }

      const controls = splitAtSlash(controlTokens).map((control) =>
        resolveControlPoint(
          control,
          current,
          endpoint,
          width,
          height,
          inheritedStyle
        )
      )

      if (command === 'curve') {
        if (controls.length === 1) {
          path += ` Q${pointString(controls[0])} ${pointString(endpoint)}`
        } else if (controls.length === 2) {
          path += ` C${pointString(controls[0])} ${pointString(
            controls[1]
          )} ${pointString(endpoint)}`
        } else {
          throw new Error(
            'A `curve` command accepts one or two control points.'
          )
        }
      } else if (!controls.length) {
        path += ` T${pointString(endpoint)}`
      } else if (controls.length === 1) {
        path += ` S${pointString(controls[0])} ${pointString(endpoint)}`
      } else {
        throw new Error('A `smooth` command accepts at most one control point.')
      }

      current = endpoint
      continue
    }

    if (command === 'arc') {
      const optionIndex = tokens.findIndex((token) =>
        ['of', 'cw', 'ccw', 'large', 'small', 'rotate'].includes(token)
      )
      const endpointTokens =
        optionIndex === -1 ? tokens : tokens.slice(0, optionIndex)
      const options = optionIndex === -1 ? [] : tokens.slice(optionIndex)
      const endpoint = resolveEndpoint(
        endpointTokens,
        current,
        width,
        height,
        inheritedStyle
      )
      let rx = 0
      let ry = 0
      let rotation = 0
      let large = 0
      let sweep = 0

      for (let index = 0; index < options.length; index++) {
        const option = options[index]
        if (option === 'of') {
          const firstRadius = options[++index]
          if (!firstRadius)
            throw new Error('Invalid `arc` radius in `shape()`.')
          const secondRadius = options[index + 1]
          const hasSecondRadius =
            secondRadius &&
            !['cw', 'ccw', 'large', 'small', 'rotate'].includes(secondRadius)
          if (hasSecondRadius) index++
          if (hasSecondRadius) {
            rx = resolveLength(firstRadius, width, inheritedStyle)
            ry = resolveLength(secondRadius, height, inheritedStyle)
          } else {
            const base =
              Math.sqrt(width * width + height * height) / Math.sqrt(2)
            rx = ry = resolveLength(firstRadius, base, inheritedStyle)
          }
        } else if (option === 'cw' || option === 'ccw') {
          sweep = option === 'cw' ? 1 : 0
        } else if (option === 'large' || option === 'small') {
          large = option === 'large' ? 1 : 0
        } else if (option === 'rotate') {
          const angle = options[++index]
          if (!angle) throw new Error('Invalid `arc` rotation in `shape()`.')
          const degree = calcDegree(angle)
          if (typeof degree === 'undefined') {
            throw new Error('Invalid `arc` rotation in `shape()`.')
          }
          rotation = degree
        } else {
          throw new Error('Invalid `arc` option in `shape()`.')
        }
      }

      path += ` A${format(Math.abs(rx))},${format(Math.abs(ry))} ${format(
        rotation
      )} ${large} ${sweep} ${pointString(endpoint)}`
      current = endpoint
      continue
    }

    throw new Error(`Unsupported \`${command}\` command in \`shape()\`.`)
  }

  return {
    type: 'path',
    d: path,
    'fill-rule': fillRule,
  }
}

function tokenize(value: string) {
  return value.trim().replace(/\//g, ' / ').split(/\s+/).filter(Boolean)
}

function splitAtSlash(tokens: string[]) {
  if (!tokens.length) return []
  const slash = tokens.indexOf('/')
  return slash === -1
    ? [tokens]
    : [tokens.slice(0, slash), tokens.slice(slash + 1)]
}

function resolveEndpoint(
  tokens: string[],
  current: Point,
  width: number,
  height: number,
  inheritedStyle: Record<string, string | number>
) {
  const mode = tokens[0]
  if (mode !== 'to' && mode !== 'by') {
    throw new Error('A `shape()` command must use `to` or `by`.')
  }
  const point = resolvePosition(tokens.slice(1), width, height, inheritedStyle)
  return mode === 'by'
    ? ([current[0] + point[0], current[1] + point[1]] as Point)
    : point
}

function resolveControlPoint(
  tokens: string[],
  start: Point,
  end: Point,
  width: number,
  height: number,
  inheritedStyle: Record<string, string | number>
) {
  const fromIndex = tokens.indexOf('from')
  const pointTokens = fromIndex === -1 ? tokens : tokens.slice(0, fromIndex)
  const reference = fromIndex === -1 ? undefined : tokens[fromIndex + 1]
  if (fromIndex !== -1 && (fromIndex + 2 !== tokens.length || !reference)) {
    throw new Error('Invalid control point reference in `shape()`.')
  }
  const point = resolvePosition(
    pointTokens,
    width,
    height,
    inheritedStyle,
    true
  )

  if (reference === 'start' || (!reference && !hasPositionKeyword(tokens))) {
    return [start[0] + point[0], start[1] + point[1]] as Point
  }
  if (reference === 'end') {
    return [end[0] + point[0], end[1] + point[1]] as Point
  }
  if (reference === 'origin') return point
  return point
}

function resolvePosition(
  tokens: string[],
  width: number,
  height: number,
  inheritedStyle: Record<string, string | number>,
  isControlPoint = false
): Point {
  if (!tokens.length || tokens.length > 4) {
    throw new Error('Invalid position in `shape()`.')
  }

  let x: number | undefined
  let y: number | undefined
  const remaining = [...tokens]

  for (let index = 0; index < remaining.length; index++) {
    const token = remaining[index]
    if (
      token === 'left' ||
      token === 'right' ||
      token === 'x-start' ||
      token === 'x-end'
    ) {
      const next = remaining[index + 1]
      if (next && !isPositionKeyword(next)) {
        const offset = resolveLength(next, width, inheritedStyle)
        x = token === 'left' || token === 'x-start' ? offset : width - offset
        index++
      } else {
        x = horizontalKeywords[token] * width
      }
    } else if (
      token === 'top' ||
      token === 'bottom' ||
      token === 'y-start' ||
      token === 'y-end'
    ) {
      const next = remaining[index + 1]
      if (next && !isPositionKeyword(next)) {
        const offset = resolveLength(next, height, inheritedStyle)
        y = token === 'top' || token === 'y-start' ? offset : height - offset
        index++
      } else {
        y = verticalKeywords[token] * height
      }
    } else if (token === 'center') {
      if (x === undefined) x = width / 2
      else if (y === undefined) y = height / 2
      else throw new Error('Invalid position in `shape()`.')
    } else if (x === undefined) {
      x = resolveLength(token, width, inheritedStyle)
    } else if (y === undefined) {
      y = resolveLength(token, height, inheritedStyle)
    } else {
      throw new Error('Invalid position in `shape()`.')
    }
  }

  if (!isControlPoint && tokens.length === 1 && y === undefined) y = height / 2
  return [
    x ?? (isControlPoint ? 0 : width / 2),
    y ?? (isControlPoint ? 0 : height / 2),
  ]
}

function isPositionKeyword(value: string) {
  return value in horizontalKeywords || value in verticalKeywords
}

function hasPositionKeyword(tokens: string[]) {
  return tokens.some(isPositionKeyword)
}

function resolveLength(
  value: string,
  base: number,
  inheritedStyle: Record<string, string | number>
) {
  const resolved = lengthToNumber(
    value,
    inheritedStyle.fontSize as number,
    base,
    inheritedStyle,
    true
  )
  if (typeof resolved === 'undefined') {
    throw new Error(`Invalid length \`${value}\` in \`shape()\`.`)
  }
  return resolved
}

function pointString(point: Point) {
  return `${format(point[0])},${format(point[1])}`
}
