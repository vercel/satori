/**
 * Expands the `background` shorthand into its longhands:
 * https://www.w3.org/TR/css-backgrounds-3/#background
 */

import valueParser from 'postcss-value-parser'
import cssColorParse from 'parse-css-color'

const IMAGE_FUNCTION = /^(url|(repeating-)?(linear|radial|conic)-gradient)$/i
const REPEAT_KEYWORDS = ['repeat', 'space', 'round', 'no-repeat']
const ATTACHMENTS = ['scroll', 'fixed', 'local']
const BOXES = ['border-box', 'padding-box', 'content-box']
const POSITION_KEYWORDS = ['left', 'right', 'top', 'bottom', 'center']
const SIZE_KEYWORDS = ['auto', 'cover', 'contain']

const isLengthPercentage = (word: string) =>
  /^[+-]?(\d+\.?\d*|\.\d+)(px|em|rem|vw|vh|vmin|vmax|%)?$/i.test(word)

interface Layer {
  image: string
  position: string
  size: string
  repeat: string
  origin: string
  clip: string
  color?: string
}

function invalid(value: string): never {
  throw new Error(`Invalid \`background\` value: "${value}".`)
}

/**
 * `<bg-image> || <bg-position> [ / <bg-size> ]? || <repeat-style> ||
 * <attachment> || <box> || <box>`, and a color in the final layer.
 */
function parseLayer(
  nodes: valueParser.Node[],
  isFinal: boolean,
  value: string
): Layer {
  let image: string | undefined
  let position: string | undefined
  let size: string | undefined
  let repeat: string | undefined
  let attachment: string | undefined
  let color: string | undefined
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
    } else if (attachment === undefined && ATTACHMENTS.includes(word)) {
      attachment = word
    } else if (
      boxes.length < 2 &&
      (BOXES.includes(word) || (isFinal && word === 'text'))
    ) {
      boxes.push(word)
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
    } else if (
      isFinal &&
      color === undefined &&
      (node.type === 'word' || node.type === 'function') &&
      (word === 'transparent' || cssColorParse(valueParser.stringify(node)))
    ) {
      color = valueParser.stringify(node)
    } else {
      invalid(value)
    }
  }

  return {
    image: image ?? 'none',
    position: position ?? '0% 0%',
    size: size ?? 'auto',
    repeat: repeat ?? 'repeat',
    origin: boxes[0] ?? 'padding-box',
    clip: boxes[1] ?? boxes[0] ?? 'border-box',
    color,
  }
}

/**
 * Like other shorthands, omitted longhands are reset, which leaves them
 * `undefined` here.
 */
export function expandBackground(value: string) {
  const layerNodes: valueParser.Node[][] = [[]]
  for (const node of valueParser(value).nodes) {
    if (node.type === 'div' && node.value === ',') layerNodes.push([])
    else if (node.type !== 'space' && node.type !== 'comment') {
      layerNodes[layerNodes.length - 1].push(node)
    }
  }
  if (layerNodes.some((nodes) => !nodes.length)) invalid(value)

  const layers = layerNodes.map((nodes, i) =>
    parseLayer(nodes, i === layerNodes.length - 1, value)
  )
  const finalLayer = layers[layers.length - 1]
  const hasImage = layers.some((layer) => layer.image !== 'none')
  const list = (key: keyof Layer) =>
    hasImage ? layers.map((layer) => layer[key]).join(', ') : undefined

  return {
    backgroundColor: finalLayer.color,
    backgroundImage: list('image'),
    backgroundPosition: list('position'),
    backgroundSize: list('size'),
    backgroundRepeat: list('repeat'),
    backgroundOrigin: list('origin'),
    backgroundClip:
      finalLayer.clip === 'border-box' ? undefined : finalLayer.clip,
  }
}
