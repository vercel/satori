/**
 * Parses `calc()`, `min()`, `max()` and `clamp()`.
 * https://drafts.csswg.org/css-values-4/#math
 */

export interface MathValue {
  /** Evaluates the expression, with percentages of `basis`. */
  evaluate: (basis: number) => number
  /** Whether the result depends on `basis`. */
  percentage: boolean
  /** Lengths and percentages are lengths, unitless values numbers. */
  type: 'length' | 'number'
}

export const MATH_FUNCTION = /^(calc|min|max|clamp)\(/i

type Token =
  | { kind: 'value'; value: number; unit: string }
  | { kind: 'function'; name: string }
  | { kind: '(' | ')' | ',' | '+' | '-' | '*' | '/' }

const NUMBER = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)([a-z]+|%)?/i

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  while (i < input.length) {
    const char = input[i]
    if (/\s/.test(char)) {
      i++
      continue
    }
    const previous = tokens[tokens.length - 1]
    // A sign is part of a number at the start of an operand.
    const operandStart =
      !previous || (previous.kind !== 'value' && previous.kind !== ')')
    const number =
      operandStart || !/[+-]/.test(char) ? NUMBER.exec(input.slice(i)) : null
    if (number) {
      tokens.push({
        kind: 'value',
        value: parseFloat(number[1]),
        unit: (number[2] || '').toLowerCase(),
      })
      i += number[0].length
      continue
    }
    const name = /^([a-z-]+)\(/i.exec(input.slice(i))
    if (name) {
      tokens.push({ kind: 'function', name: name[1].toLowerCase() })
      i += name[0].length
      continue
    }
    if ('(),+-*/'.includes(char)) {
      tokens.push({ kind: char as '(' })
      i++
      continue
    }
    throw new Error(`Invalid character "${char}" in "${input}".`)
  }
  return tokens
}

type Node = Omit<MathValue, 'percentage'> & { percentage: boolean }

/**
 * Returns `undefined` if the value isn't a valid math function. Lengths are
 * resolved to px with `resolveLength`.
 */
export function parseMath(
  input: string,
  resolveLength: (length: string) => number | undefined
): MathValue | undefined {
  if (!MATH_FUNCTION.test(input.trim())) return
  let tokens: Token[]
  try {
    tokens = tokenize(input.trim())
  } catch {
    return
  }
  let index = 0
  const peek = () => tokens[index]
  const expect = (kind: Token['kind']) => {
    if (tokens[index]?.kind !== kind) throw new Error(`Expected ${kind}.`)
    index++
  }

  const sum = (): Node => {
    let node = product()
    while (peek()?.kind === '+' || peek()?.kind === '-') {
      const operator = tokens[index++].kind
      const right = product()
      if (right.type !== node.type) throw new Error('Mismatched types.')
      const left = node
      node = {
        type: left.type,
        percentage: left.percentage || right.percentage,
        evaluate:
          operator === '+'
            ? (basis) => left.evaluate(basis) + right.evaluate(basis)
            : (basis) => left.evaluate(basis) - right.evaluate(basis),
      }
    }
    return node
  }

  const product = (): Node => {
    let node = value()
    while (peek()?.kind === '*' || peek()?.kind === '/') {
      const operator = tokens[index++].kind
      const right = value()
      const left = node
      if (operator === '*') {
        if (left.type === 'length' && right.type === 'length') {
          throw new Error('Lengths cannot be multiplied.')
        }
        node = {
          type: left.type === 'length' ? 'length' : right.type,
          percentage: left.percentage || right.percentage,
          evaluate: (basis) => left.evaluate(basis) * right.evaluate(basis),
        }
      } else {
        if (right.type !== 'number') {
          throw new Error('Values can only be divided by numbers.')
        }
        node = {
          type: left.type,
          percentage: left.percentage || right.percentage,
          evaluate: (basis) => left.evaluate(basis) / right.evaluate(basis),
        }
      }
    }
    return node
  }

  const list = (): Node[] => {
    const nodes = [sum()]
    while (peek()?.kind === ',') {
      index++
      nodes.push(sum())
    }
    expect(')')
    if (nodes.some((node) => node.type !== nodes[0].type)) {
      throw new Error('Mismatched types.')
    }
    return nodes
  }

  const value = (): Node => {
    const token = tokens[index++]
    if (!token) throw new Error('Unexpected end.')
    if (token.kind === 'value') {
      const { value: number, unit } = token
      if (!unit) {
        return { type: 'number', percentage: false, evaluate: () => number }
      }
      if (unit === '%') {
        return {
          type: 'length',
          percentage: true,
          evaluate: (basis) => (basis * number) / 100,
        }
      }
      const px = resolveLength(`${number}${unit}`)
      if (typeof px !== 'number') throw new Error(`Invalid length.`)
      return { type: 'length', percentage: false, evaluate: () => px }
    }
    if (token.kind === '(') {
      const node = sum()
      expect(')')
      return node
    }
    if (token.kind === 'function') {
      if (token.name === 'calc') {
        const node = sum()
        expect(')')
        return node
      }
      if (token.name === 'min' || token.name === 'max') {
        const nodes = list()
        const pick = token.name === 'min' ? Math.min : Math.max
        return {
          type: nodes[0].type,
          percentage: nodes.some((node) => node.percentage),
          evaluate: (basis) =>
            pick(...nodes.map((node) => node.evaluate(basis))),
        }
      }
      if (token.name === 'clamp') {
        const nodes = list()
        if (nodes.length !== 3) throw new Error('Expected 3 values.')
        const [min, preferred, max] = nodes
        return {
          type: preferred.type,
          percentage: nodes.some((node) => node.percentage),
          evaluate: (basis) =>
            Math.max(
              min.evaluate(basis),
              Math.min(preferred.evaluate(basis), max.evaluate(basis))
            ),
        }
      }
    }
    throw new Error('Unexpected token.')
  }

  try {
    const node = value()
    if (index !== tokens.length) return
    return node
  } catch {
    return
  }
}
