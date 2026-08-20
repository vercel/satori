import type { BackdropFilter } from '../parser/backdrop-filter.js'
import { buildXMLString } from '../utils.js'

export function backdropFilter({
  id,
  left,
  top,
  width,
  height,
  path,
  type,
  matrix,
  currentClipPath,
  mask,
  filters,
}: {
  id: string
  left: number
  top: number
  width: number
  height: number
  path: string
  type: 'rect' | 'path'
  matrix: string | undefined
  currentClipPath: string | undefined
  mask: string | undefined
  filters: BackdropFilter[]
}) {
  if (!filters.length) return ['', ''] as const

  const filterId = `satori_bf-${id}`
  const clipId = `satori_bfc-${id}`
  const expansion = getExpansion(filters)
  let input = 'BackgroundImage'
  let primitives = ''

  filters.forEach((filter, index) => {
    const result = `${filterId}-${index}`
    primitives += buildFilterPrimitive(filter, input, result)
    input = result
  })

  const definitions =
    buildXMLString(
      'filter',
      {
        id: filterId,
        x: left - expansion.left,
        y: top - expansion.top,
        width: width + expansion.left + expansion.right,
        height: height + expansion.top + expansion.bottom,
        filterUnits: 'userSpaceOnUse',
        'color-interpolation-filters': 'sRGB',
      },
      primitives
    ) +
    buildXMLString(
      'clipPath',
      {
        id: clipId,
        'clip-path': currentClipPath,
      },
      buildXMLString(type, {
        x: left,
        y: top,
        width,
        height,
        d: path || undefined,
        transform: matrix || undefined,
      })
    )

  const shape = buildXMLString(type, {
    x: left,
    y: top,
    width,
    height,
    d: path || undefined,
    fill: '#000',
    transform: matrix || undefined,
    filter: `url(#${filterId})`,
    'clip-path': `url(#${clipId})`,
    mask,
  })

  return [definitions, shape] as const
}

function buildFilterPrimitive(
  filter: BackdropFilter,
  input: string,
  result: string
) {
  if (filter.type === 'blur') {
    return buildXMLString('feGaussianBlur', {
      in: input,
      stdDeviation: filter.value,
      result,
    })
  }

  if (filter.type === 'hue-rotate') {
    return buildXMLString('feColorMatrix', {
      in: input,
      type: 'hueRotate',
      values: filter.value,
      result,
    })
  }

  if (filter.type === 'saturate' || filter.type === 'grayscale') {
    return buildXMLString('feColorMatrix', {
      in: input,
      type: 'saturate',
      values: filter.type === 'grayscale' ? 1 - filter.value : filter.value,
      result,
    })
  }

  if (filter.type === 'sepia') {
    const amount = filter.value
    const inverse = 1 - amount
    return buildXMLString('feColorMatrix', {
      in: input,
      type: 'matrix',
      values: [
        inverse + 0.393 * amount,
        0.769 * amount,
        0.189 * amount,
        0,
        0,
        0.349 * amount,
        inverse + 0.686 * amount,
        0.168 * amount,
        0,
        0,
        0.272 * amount,
        0.534 * amount,
        inverse + 0.131 * amount,
        0,
        0,
        0,
        0,
        0,
        1,
        0,
      ].join(' '),
      result,
    })
  }

  if (filter.type === 'drop-shadow') {
    const clippedInput = `${result}-input`
    return (
      buildXMLString('feComposite', {
        in: input,
        in2: 'SourceAlpha',
        operator: 'in',
        result: clippedInput,
      }) +
      buildXMLString('feDropShadow', {
        in: clippedInput,
        dx: filter.offsetX,
        dy: filter.offsetY,
        stdDeviation: filter.blurRadius,
        'flood-color': filter.color,
        result,
      })
    )
  }

  const amount = filter.value
  const attributes =
    filter.type === 'brightness'
      ? { slope: amount }
      : filter.type === 'contrast'
      ? { slope: amount, intercept: 0.5 - 0.5 * amount }
      : filter.type === 'invert'
      ? { slope: 1 - 2 * amount, intercept: amount }
      : { slope: amount }
  const channels = filter.type === 'opacity' ? ['A'] : ['R', 'G', 'B']

  return buildXMLString(
    'feComponentTransfer',
    { in: input, result },
    channels
      .map((channel) =>
        buildXMLString(`feFunc${channel}`, {
          type: 'linear',
          ...attributes,
        })
      )
      .join('')
  )
}

function getExpansion(filters: BackdropFilter[]) {
  let left = 0
  let top = 0
  let right = 0
  let bottom = 0

  for (const filter of filters) {
    if (filter.type === 'blur') {
      const grow = filter.value * 3
      left = Math.max(left, grow)
      top = Math.max(top, grow)
      right = Math.max(right, grow)
      bottom = Math.max(bottom, grow)
    } else if (filter.type === 'drop-shadow') {
      const grow = filter.blurRadius * 3
      left = Math.max(left, grow - filter.offsetX)
      top = Math.max(top, grow - filter.offsetY)
      right = Math.max(right, grow + filter.offsetX)
      bottom = Math.max(bottom, grow + filter.offsetY)
    }
  }

  return { left, top, right, bottom }
}
