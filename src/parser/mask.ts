import { getPropertyName } from 'css-to-react-native'
import valueParser from 'postcss-value-parser'
import { splitEffects } from '../utils.js'

function getMaskProperty(style: Record<string, string | number>, name: string) {
  const key = getPropertyName(`mask-${name}`)
  return (style[key] || style[`WebkitM${key.substring(1)}`]) as string
}

export interface MaskProperty {
  image: string
  position: string
  size: string
  repeat: string
  origin: string
  clip: string
  /** How the layer is composited with the layers below it. */
  composite: string
}

const IMAGE_FUNCTION = /^(url|(repeating-)?(linear|radial|conic)-gradient)$/i
const REPEAT_KEYWORDS = ['repeat', 'space', 'round', 'no-repeat']
const BOXES = [
  'border-box',
  'padding-box',
  'content-box',
  'margin-box',
  'fill-box',
  'stroke-box',
  'view-box',
]
const COMPOSITE_OPERATORS = ['add', 'subtract', 'intersect', 'exclude']
const MODES = ['alpha', 'luminance', 'match-source']
/** The operators of `-webkit-mask-composite` that have standard ones. */
const WEBKIT_COMPOSITE_OPERATORS: Record<string, string> = {
  'source-over': 'add',
  'source-in': 'intersect',
  'source-out': 'subtract',
  xor: 'exclude',
}
const POSITION_KEYWORDS = ['left', 'right', 'top', 'bottom', 'center']
const SIZE_KEYWORDS = ['auto', 'cover', 'contain']

const isLengthPercentage = (word: string) =>
  /^[+-]?(\d+\.?\d*|\.\d+)(px|em|rem|vw|vh|vmin|vmax|%)?$/i.test(word)

function invalid(value: string): never {
  throw new Error(`Invalid \`mask\` value: "${value}".`)
}

/**
 * `<mask-reference> || <position> [ / <bg-size> ]? || <repeat-style> ||
 * <geometry-box> || [ <geometry-box> | no-clip ] || <compositing-operator> ||
 * <masking-mode>`
 */
function parseLayer(nodes: valueParser.Node[], value: string) {
  let image: string | undefined
  let position: string | undefined
  let size: string | undefined
  let repeat: string | undefined
  let composite: string | undefined
  let mode: string | undefined
  const boxes: string[] = []

  // The keyword at an index, or an empty string.
  const wordAt = (i: number) =>
    nodes[i]?.type === 'word' ? nodes[i].value.toLowerCase() : ''

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const word = wordAt(i)

    if (
      image === undefined &&
      ((node.type === 'function' && IMAGE_FUNCTION.test(node.value)) ||
        word === 'none')
    ) {
      image = valueParser.stringify(node)
    } else if (
      repeat === undefined &&
      (word === 'repeat-x' || word === 'repeat-y')
    ) {
      repeat = word
    } else if (repeat === undefined && REPEAT_KEYWORDS.includes(word)) {
      repeat = word
      if (REPEAT_KEYWORDS.includes(wordAt(i + 1))) repeat += ' ' + wordAt(++i)
    } else if (
      boxes.length < 2 &&
      (BOXES.includes(word) || (boxes.length === 1 && word === 'no-clip'))
    ) {
      boxes.push(word)
    } else if (composite === undefined && COMPOSITE_OPERATORS.includes(word)) {
      composite = word
    } else if (mode === undefined && MODES.includes(word)) {
      mode = word
    } else if (
      position === undefined &&
      (POSITION_KEYWORDS.includes(word) || isLengthPercentage(word))
    ) {
      const tokens = [word]
      while (
        tokens.length < 4 &&
        (POSITION_KEYWORDS.includes(wordAt(i + 1)) ||
          isLengthPercentage(wordAt(i + 1)))
      ) {
        tokens.push(wordAt(++i))
      }
      position = tokens.join(' ')

      if (nodes[i + 1]?.type === 'div' && nodes[i + 1].value === '/') {
        i++
        const sizeTokens: string[] = []
        while (
          sizeTokens.length < 2 &&
          (SIZE_KEYWORDS.includes(wordAt(i + 1)) ||
            isLengthPercentage(wordAt(i + 1)))
        ) {
          sizeTokens.push(wordAt(++i))
        }
        if (!sizeTokens.length) invalid(value)
        size = sizeTokens.join(' ')
      }
    } else {
      invalid(value)
    }
  }

  return {
    image: image ?? 'none',
    position: position ?? '0% 0%',
    size: size ?? 'auto',
    repeat: repeat ?? 'repeat',
    origin: boxes[0] ?? 'border-box',
    clip: boxes[1] ?? boxes[0] ?? 'border-box',
    composite: composite ?? 'add',
    mode: mode ?? 'match-source',
  }
}

/**
 * Expands the `mask` shorthand into its longhands, as lists of the values of
 * each layer: https://drafts.fxtf.org/css-masking/#the-mask
 */
export function expandMask(value: string) {
  const layerNodes: valueParser.Node[][] = [[]]
  for (const node of valueParser(value).nodes) {
    if (node.type === 'div' && node.value === ',') layerNodes.push([])
    else if (node.type !== 'space' && node.type !== 'comment') {
      layerNodes[layerNodes.length - 1].push(node)
    }
  }
  if (layerNodes.some((nodes) => !nodes.length)) invalid(value)

  const layers = layerNodes.map((nodes) => parseLayer(nodes, value))
  const list = (key: keyof typeof layers[number]) =>
    layers.map((layer) => layer[key]).join(', ')

  return {
    maskImage: list('image'),
    maskPosition: list('position'),
    maskSize: list('size'),
    maskRepeat: list('repeat'),
    maskOrigin: list('origin'),
    maskClip: list('clip'),
    maskComposite: list('composite'),
    maskMode: list('mode'),
  }
}

/**
 * The layers of a mask, from the bottom one. Like in CSS, lists of values are
 * repeated for layers that they're too short for.
 */
export function parseMask(
  style: Record<string, string | number>
): MaskProperty[] {
  const maskImage = (style.maskImage || style.WebkitMaskImage) as string

  const values = (name: string, initial: string) => {
    const value = getMaskProperty(style, name)
    const list = value ? splitEffects(String(value)) : []
    return (i: number) => (list.length ? list[i % list.length].trim() : initial)
  }
  const position = values('position', '0% 0%')
  const size = values('size', 'auto')
  const repeat = values('repeat', 'repeat')
  const origin = values('origin', 'border-box')
  const clip = values('clip', 'border-box')
  const composite = values('composite', 'add')

  return splitEffects(maskImage || '')
    .map((image, i) => ({
      image,
      position: position(i),
      size: size(i),
      repeat: repeat(i),
      origin: origin(i),
      clip: clip(i),
      composite:
        WEBKIT_COMPOSITE_OPERATORS[composite(i).toLowerCase()] ??
        composite(i).toLowerCase(),
    }))
    .filter(({ image }) => image && image !== 'none')
    .reverse()
}
