/**
 * Parses colors of CSS Color 4 and 5, and converts them to sRGB.
 *
 * @see https://www.w3.org/TR/css-color-4/
 * @see https://www.w3.org/TR/css-color-5/
 */
import valueParser, { type Node, type FunctionNode } from 'postcss-value-parser'
import cssColorParse from 'parse-css-color'

/** Red, green and blue from 0 to 255, and alpha from 0 to 1. */
export type RGBA = [r: number, g: number, b: number, alpha: number]

type Space =
  | 'srgb'
  | 'srgb-linear'
  | 'display-p3'
  | 'a98-rgb'
  | 'prophoto-rgb'
  | 'rec2020'
  | 'xyz-d65'
  | 'xyz-d50'
  | 'lab'
  | 'lch'
  | 'oklab'
  | 'oklch'
  | 'hsl'
  | 'hwb'

/** A missing component (`none`) is `null`. */
type Coord = number | null
type Coords = [Coord, Coord, Coord]

/** A parsed color, which may be out of the sRGB gamut. */
export interface Color {
  space: Space
  coords: Coords
  alpha: Coord
}

// Conversions, from the sample code of CSS Color 4.

type Matrix = number[][]

const multiply = (m: Matrix, [a, b, c]: number[]) =>
  m.map((row) => row[0] * a + row[1] * b + row[2] * c)

function invert(m: Matrix): Matrix {
  const [[a, b, c], [d, e, f], [g, h, i]] = m
  const A = e * i - f * h
  const B = f * g - d * i
  const C = d * h - e * g
  const det = a * A + b * B + c * C
  return [
    [A / det, (c * h - b * i) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, (c * d - a * f) / det],
    [C / det, (b * g - a * h) / det, (a * e - b * d) / det],
  ]
}

const D50 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585]

const D65_TO_D50: Matrix = [
  [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
  [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
  [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
]
const D50_TO_D65 = invert(D65_TO_D50)

interface RGBSpace {
  toXYZ: Matrix
  fromXYZ: Matrix
  toLinear: (c: number) => number
  fromLinear: (c: number) => number
  /** The white point of `toXYZ`. */
  d50?: boolean
}

const signed =
  (f: (c: number) => number) =>
  (c: number): number =>
    c < 0 ? -f(-c) : f(c)

const srgbToLinear = signed((c) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
)
const srgbFromLinear = signed((c) =>
  c > 0.0031308 ? 1.055 * c ** (1 / 2.4) - 0.055 : 12.92 * c
)

const REC2020_ALPHA = 1.09929682680944
const REC2020_BETA = 0.018053968510807

function rgbSpace(
  matrix: Matrix,
  toLinear: (c: number) => number,
  fromLinear: (c: number) => number,
  d50?: boolean
): RGBSpace {
  return { toXYZ: matrix, fromXYZ: invert(matrix), toLinear, fromLinear, d50 }
}

const RGB_SPACES: Partial<Record<Space, RGBSpace>> = {
  srgb: rgbSpace(
    [
      [506752 / 1228815, 87881 / 245763, 12673 / 70218],
      [87098 / 409605, 175762 / 245763, 12673 / 175545],
      [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
    ],
    srgbToLinear,
    srgbFromLinear
  ),
  'display-p3': rgbSpace(
    [
      [608311 / 1250200, 189793 / 714400, 198249 / 1000160],
      [35783 / 156275, 247089 / 357200, 198249 / 2500400],
      [0, 32229 / 714400, 5220557 / 5000800],
    ],
    srgbToLinear,
    srgbFromLinear
  ),
  'a98-rgb': rgbSpace(
    [
      [573536 / 994567, 263643 / 1420810, 187206 / 994567],
      [591459 / 1989134, 6239551 / 9945670, 374412 / 4972835],
      [53769 / 1989134, 351524 / 4972835, 4929758 / 4972835],
    ],
    signed((c) => c ** (563 / 256)),
    signed((c) => c ** (256 / 563))
  ),
  'prophoto-rgb': rgbSpace(
    [
      [0.7977666449006423, 0.13518129740053308, 0.0313477341283922],
      [0.2880748288194013, 0.711835234241873, 0.00008993693872564],
      [0, 0, 0.8251046025104602],
    ],
    signed((c) => (c <= 16 / 512 ? c / 16 : c ** 1.8)),
    signed((c) => (c >= 1 / 512 ? c ** (1 / 1.8) : 16 * c)),
    true
  ),
  rec2020: rgbSpace(
    [
      [63426534 / 99577255, 20160776 / 139408157, 47086771 / 278816314],
      [26158966 / 99577255, 472592308 / 697040785, 8267143 / 139408157],
      [0, 19567812 / 697040785, 295819943 / 278816314],
    ],
    signed((c) =>
      c < REC2020_BETA * 4.5
        ? c / 4.5
        : ((c + REC2020_ALPHA - 1) / REC2020_ALPHA) ** (1 / 0.45)
    ),
    signed((c) =>
      c > REC2020_BETA
        ? REC2020_ALPHA * c ** 0.45 - (REC2020_ALPHA - 1)
        : 4.5 * c
    )
  ),
}
RGB_SPACES['srgb-linear'] = {
  ...RGB_SPACES.srgb,
  toLinear: (c) => c,
  fromLinear: (c) => c,
}

const XYZ_TO_LMS: Matrix = [
  [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663506424],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
]
const LMS_TO_OKLAB: Matrix = [
  [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
  [1.9779985324311684, -2.42859224204858, 0.450593709617411],
  [0.0259040424655478, 0.7827717124575296, -0.8086757548780773],
]
const LMS_TO_XYZ = invert(XYZ_TO_LMS)
const OKLAB_TO_LMS = invert(LMS_TO_OKLAB)

const LAB_EPSILON = 216 / 24389
const LAB_KAPPA = 24389 / 27

function labToXYZD50([l, a, b]: number[]) {
  const f1 = (l + 16) / 116
  const f0 = a / 500 + f1
  const f2 = f1 - b / 200
  const cube = (f: number) =>
    f ** 3 > LAB_EPSILON ? f ** 3 : (116 * f - 16) / LAB_KAPPA
  return [
    cube(f0) * D50[0],
    (l > LAB_KAPPA * LAB_EPSILON ? f1 ** 3 : l / LAB_KAPPA) * D50[1],
    cube(f2) * D50[2],
  ]
}

function xyzD50ToLab(xyz: number[]) {
  const [f0, f1, f2] = xyz.map((v, i) => {
    v /= D50[i]
    return v > LAB_EPSILON ? Math.cbrt(v) : (LAB_KAPPA * v + 16) / 116
  })
  return [116 * f1 - 16, 500 * (f0 - f1), 200 * (f1 - f2)]
}

const toPolar = ([l, a, b]: number[]) => [
  l,
  Math.hypot(a, b),
  normalizeHue((Math.atan2(b, a) * 180) / Math.PI),
]
const fromPolar = ([l, c, h]: number[]) => [
  l,
  c * Math.cos((h * Math.PI) / 180),
  c * Math.sin((h * Math.PI) / 180),
]

const normalizeHue = (h: number) => ((h % 360) + 360) % 360

/** `s` and `l` are from 0 to 100, and the result is from 0 to 1. */
function hslToSRGB([h, s, l]: number[]) {
  s /= 100
  l /= 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}

/** The hue is `NaN` when it's powerless. */
function srgbToHSL([r, g, b]: number[]) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (min + max) / 2
  const d = max - min
  let h = NaN
  let s = 0
  if (d !== 0) {
    s = l === 0 || l === 1 ? 0 : (max - l) / Math.min(l, 1 - l)
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
  }
  // A negative saturation means the hue is opposite.
  if (s < 0) {
    h += 180
    s = -s
  }
  return [normalizeHue(h), s * 100, l * 100]
}

function hwbToSRGB([h, w, b]: number[]) {
  w /= 100
  b /= 100
  if (w + b >= 1) {
    const gray = w / (w + b)
    return [gray, gray, gray]
  }
  return hslToSRGB([h, 100, 50]).map((c) => c * (1 - w - b) + w)
}

function srgbToHWB(rgb: number[]) {
  const [h] = srgbToHSL(rgb)
  const w = Math.min(...rgb)
  const b = 1 - Math.max(...rgb)
  return [w + b >= 1 ? NaN : h, w * 100, b * 100]
}

/** Converts known coordinates to XYZ with a D65 white point. */
function toXYZ(space: Space, coords: number[]): number[] {
  const rgb = RGB_SPACES[space]
  if (rgb) {
    const xyz = multiply(rgb.toXYZ, coords.map(rgb.toLinear))
    return rgb.d50 ? multiply(D50_TO_D65, xyz) : xyz
  }
  switch (space) {
    case 'xyz-d65':
      return coords
    case 'xyz-d50':
      return multiply(D50_TO_D65, coords)
    case 'lab':
      return multiply(D50_TO_D65, labToXYZD50(coords))
    case 'lch':
      return toXYZ('lab', fromPolar(coords))
    case 'oklab':
      return multiply(
        LMS_TO_XYZ,
        multiply(OKLAB_TO_LMS, coords).map((c) => c ** 3)
      )
    case 'oklch':
      return toXYZ('oklab', fromPolar(coords))
    case 'hsl':
      return toXYZ('srgb', hslToSRGB(coords))
    case 'hwb':
      return toXYZ('srgb', hwbToSRGB(coords))
  }
}

/** Converts XYZ with a D65 white point. A powerless hue is `NaN`. */
function fromXYZ(space: Space, xyz: number[]): number[] {
  const rgb = RGB_SPACES[space]
  if (rgb) {
    return multiply(rgb.fromXYZ, rgb.d50 ? multiply(D65_TO_D50, xyz) : xyz).map(
      rgb.fromLinear
    )
  }
  switch (space) {
    case 'xyz-d65':
      return xyz
    case 'xyz-d50':
      return multiply(D65_TO_D50, xyz)
    case 'lab':
      return xyzD50ToLab(multiply(D65_TO_D50, xyz))
    case 'lch': {
      const lch = toPolar(fromXYZ('lab', xyz))
      if (lch[1] < 0.0015) lch[2] = NaN
      return lch
    }
    case 'oklab':
      return multiply(
        LMS_TO_OKLAB,
        multiply(XYZ_TO_LMS, xyz).map((c) => Math.cbrt(c))
      )
    case 'oklch': {
      const oklch = toPolar(fromXYZ('oklab', xyz))
      if (oklch[1] < 0.000004) oklch[2] = NaN
      return oklch
    }
    case 'hsl':
      return srgbToHSL(fromXYZ('srgb', xyz))
    case 'hwb':
      return srgbToHWB(fromXYZ('srgb', xyz))
  }
}

const POLAR: Partial<Record<Space, boolean>> = {
  lch: true,
  oklch: true,
  hsl: true,
  hwb: true,
}

/**
 * Components that are analogous across color spaces, so missing ones are
 * carried forward to them.
 */
function analogous(space: Space): (string | undefined)[] {
  if (RGB_SPACES[space]) return ['red', 'green', 'blue']
  switch (space) {
    case 'xyz-d65':
    case 'xyz-d50':
      return ['red', 'green', 'blue']
    case 'lab':
    case 'oklab':
      return ['lightness', 'a', 'b']
    case 'lch':
    case 'oklch':
      return ['lightness', 'colorfulness', 'hue']
    case 'hsl':
      return ['hue', 'colorfulness', 'lightness']
    case 'hwb':
      return ['hue', undefined, undefined]
  }
}

/**
 * Converts a color to another space. Missing components become 0, unless
 * they're carried forward to an analogous component.
 */
function convert(color: Color, space: Space): Color {
  if (color.space === space) return color
  const coords = fromXYZ(
    space,
    toXYZ(
      color.space,
      color.coords.map((c) => c ?? 0)
    )
  ).map((c) => (Number.isNaN(c) ? null : c)) as Coords
  const from = analogous(color.space)
  const to = analogous(space)
  color.coords.forEach((c, i) => {
    if (c === null && from[i]) {
      const j = to.indexOf(from[i])
      if (j !== -1) coords[j] = null
    }
  })
  return { space, coords, alpha: color.alpha }
}

/** Converts a color to sRGB, clipped to its gamut. */
export function toRGBA(color: Color): RGBA {
  const { coords, alpha } = convert(color, 'srgb')
  const clip = (c: Coord) => Math.min(Math.max(c ?? 0, 0), 1) * 255
  return [
    clip(coords[0]),
    clip(coords[1]),
    clip(coords[2]),
    Math.min(Math.max(alpha ?? 0, 0), 1),
  ]
}

// Parsing.

const significant = (nodes: Node[]) =>
  nodes.filter((node) => node.type !== 'space' && node.type !== 'comment')

const isComma = (node: Node) => node.type === 'div' && node.value === ','
const isSlash = (node: Node) => node.type === 'div' && node.value === '/'

/** Splits the arguments of a function at commas. */
function splitArguments(node: FunctionNode): Node[][] {
  const args: Node[][] = [[]]
  for (const child of significant(node.nodes)) {
    if (isComma(child)) args.push([])
    else args[args.length - 1].push(child)
  }
  return args
}

interface Channel {
  /** The value of `100%`, or `0` if percentages aren't allowed. */
  percent: number
  hue?: boolean
}

const ANGLE_UNITS = {
  '': 1,
  deg: 1,
  grad: 0.9,
  rad: 180 / Math.PI,
  turn: 360,
}

/**
 * Parses a number, percentage or angle. Returns `undefined` if it's invalid.
 */
function parseNumber(value: string, channel: Channel): number | undefined {
  const parsed = valueParser.unit(value)
  if (!parsed) return
  const number = Number(parsed.number)
  if (!Number.isFinite(number)) return
  const unit = parsed.unit.toLowerCase()
  if (unit === '%')
    return channel.percent ? (number / 100) * channel.percent : undefined
  if (channel.hue && unit in ANGLE_UNITS) return number * ANGLE_UNITS[unit]
  return unit === '' ? number : undefined
}

/**
 * Evaluates `calc()` and other math functions in channels, with the channel
 * keywords of relative colors.
 */
function evaluate(
  node: Node,
  channel: Channel,
  keywords: Record<string, number>
): number | undefined {
  if (node.type === 'word') {
    const lower = node.value.toLowerCase()
    if (lower in keywords) return keywords[lower]
    if (lower === 'pi') return Math.PI
    if (lower === 'e') return Math.E
    return parseNumber(node.value, channel)
  }
  if (node.type !== 'function') return
  const name = node.value.toLowerCase()
  const args = splitArguments(node).map((tokens) =>
    evaluateSum(tokens, channel, keywords)
  )
  if (args.some((arg) => arg === undefined)) return
  switch (name) {
    case '':
    case 'calc':
      return args.length === 1 ? args[0] : undefined
    case 'min':
      return Math.min(...args)
    case 'max':
      return Math.max(...args)
    case 'clamp':
      return args.length === 3
        ? Math.max(args[0], Math.min(args[1], args[2]))
        : undefined
  }
}

/** Evaluates `a + b - c * d / e`, with the usual precedence. */
function evaluateSum(
  tokens: Node[],
  channel: Channel,
  keywords: Record<string, number>
): number | undefined {
  // `postcss-value-parser` keeps `/` as a division, and `*`, `+` and `-` as
  // words, either on their own or attached to numbers like `-1`.
  const items: (number | string)[] = []
  for (const token of tokens) {
    if (isSlash(token)) items.push('/')
    else if (token.type === 'word' && /^[*+-]$/.test(token.value)) {
      items.push(token.value)
    } else {
      const value = evaluate(token, channel, keywords)
      if (value === undefined) return
      items.push(value)
    }
  }
  let sum = 0
  let sign = 1
  let product: number | undefined
  let operator = '*'
  for (const item of items) {
    if (typeof item === 'number') {
      if (product === undefined) product = item
      else if (operator === '*') product *= item
      else if (operator === '/') product /= item
      else return
      operator = ''
    } else if (item === '*' || item === '/') {
      if (product === undefined || operator) return
      operator = item
    } else {
      if (product === undefined || operator) return
      sum += sign * product
      sign = item === '-' ? -1 : 1
      product = undefined
      operator = '*'
    }
  }
  if (product === undefined || operator) return
  return sum + sign * product
}

/** Parses a channel. Returns `null` for `none`, `undefined` if invalid. */
function parseChannel(
  node: Node,
  channel: Channel,
  keywords: Record<string, number> | undefined,
  legacy: boolean
): Coord | undefined {
  if (node.type === 'word' && node.value.toLowerCase() === 'none') {
    return legacy ? undefined : null
  }
  if (node.type === 'function' && node.value === '') return
  const value = evaluate(node, channel, keywords || {})
  return Number.isFinite(value) ? value : undefined
}

const ALPHA: Channel = { percent: 1 }

interface ChannelLayout {
  space: Space
  channels: [Channel, Channel, Channel]
  /** The channel keywords of relative colors. */
  names: [string, string, string]
  /** Converts parsed channel values to the coordinates of the space. */
  scale?: number
  allowLegacy?: boolean
  clamp?: (coords: Coords) => Coords
}

const clampLightness =
  (max: number) =>
  ([l, a, b]: Coords): Coords =>
    [l === null ? l : Math.min(Math.max(l, 0), max), a, b]

const clampChroma = (coords: Coords): Coords => [
  coords[0],
  coords[1] === null ? null : Math.max(coords[1], 0),
  coords[2] === null ? null : normalizeHue(coords[2]),
]

const HUE: Channel = { percent: 0, hue: true }

const LAYOUTS: Record<string, ChannelLayout> = {
  rgb: {
    space: 'srgb',
    channels: [{ percent: 255 }, { percent: 255 }, { percent: 255 }],
    names: ['r', 'g', 'b'],
    scale: 255,
    allowLegacy: true,
  },
  hsl: {
    space: 'hsl',
    channels: [HUE, { percent: 100 }, { percent: 100 }],
    names: ['h', 's', 'l'],
    allowLegacy: true,
    clamp: ([h, s, l]) => [h === null ? h : normalizeHue(h), s, l],
  },
  hwb: {
    space: 'hwb',
    channels: [HUE, { percent: 100 }, { percent: 100 }],
    names: ['h', 'w', 'b'],
    clamp: ([h, w, b]) => [h === null ? h : normalizeHue(h), w, b],
  },
  lab: {
    space: 'lab',
    channels: [{ percent: 100 }, { percent: 125 }, { percent: 125 }],
    names: ['l', 'a', 'b'],
    clamp: clampLightness(100),
  },
  lch: {
    space: 'lch',
    channels: [{ percent: 100 }, { percent: 150 }, HUE],
    names: ['l', 'c', 'h'],
    clamp: (coords) => clampChroma(clampLightness(100)(coords)),
  },
  oklab: {
    space: 'oklab',
    channels: [{ percent: 1 }, { percent: 0.4 }, { percent: 0.4 }],
    names: ['l', 'a', 'b'],
    clamp: clampLightness(1),
  },
  oklch: {
    space: 'oklch',
    channels: [{ percent: 1 }, { percent: 0.4 }, HUE],
    names: ['l', 'c', 'h'],
    clamp: (coords) => clampChroma(clampLightness(1)(coords)),
  },
}
LAYOUTS.rgba = LAYOUTS.rgb
LAYOUTS.hsla = LAYOUTS.hsl

const PREDEFINED_SPACES: Record<string, Space> = {
  srgb: 'srgb',
  'srgb-linear': 'srgb-linear',
  'display-p3': 'display-p3',
  'a98-rgb': 'a98-rgb',
  'prophoto-rgb': 'prophoto-rgb',
  rec2020: 'rec2020',
  xyz: 'xyz-d65',
  'xyz-d65': 'xyz-d65',
  'xyz-d50': 'xyz-d50',
}

/** Splits `[from <color>] channels... [/ alpha]` of a color function. */
function parseRelative(
  node: FunctionNode,
  currentColor: string | undefined
): { origin?: Color; tokens: Node[]; legacy: boolean } | undefined {
  let tokens = significant(node.nodes)
  let origin: Color | undefined
  if (tokens[0]?.type === 'word' && tokens[0].value.toLowerCase() === 'from') {
    origin = parseColorNode(tokens[1], currentColor)
    if (!origin) return
    tokens = tokens.slice(2)
  }
  const legacy = !origin && tokens.some(isComma)
  if (legacy) {
    // The legacy syntax separates all channels with commas.
    const values = tokens.filter((_, i) => i % 2 === 0)
    if (!tokens.every((token, i) => i % 2 === 0 || isComma(token))) return
    return { tokens: values, legacy }
  }
  return { origin, tokens, legacy }
}

function parseChannels(
  tokens: Node[],
  layout: ChannelLayout,
  origin: Color | undefined,
  legacy: boolean
): Color | undefined {
  let keywords: Record<string, number> | undefined
  if (origin) {
    const converted = convert(origin, layout.space)
    keywords = {}
    layout.names.forEach((name, i) => {
      keywords[name] = (converted.coords[i] ?? 0) * (layout.scale ?? 1)
    })
    keywords.alpha = converted.alpha ?? 0
  }

  let channels: Node[]
  let alphaToken: Node | undefined
  if (legacy) {
    if (tokens.length !== 3 && tokens.length !== 4) return
    channels = tokens.slice(0, 3)
    alphaToken = tokens[3]
  } else {
    const slash = tokens.findIndex(isSlash)
    channels = slash === -1 ? tokens : tokens.slice(0, slash)
    if (slash !== -1) {
      if (slash !== tokens.length - 2) return
      alphaToken = tokens[slash + 1]
    }
    if (channels.length !== 3) return
  }

  const coords: Coord[] = []
  for (const [i, token] of channels.entries()) {
    const value = parseChannel(token, layout.channels[i], keywords, legacy)
    if (value === undefined) return
    coords.push(value === null ? null : value / (layout.scale ?? 1))
  }
  let alpha: Coord = keywords ? keywords.alpha : 1
  if (alphaToken) {
    alpha = parseChannel(alphaToken, ALPHA, keywords, legacy)
    if (alpha === undefined) return
  }
  if (alpha !== null) alpha = Math.min(Math.max(alpha, 0), 1)
  let result = coords as Coords
  if (layout.clamp) result = layout.clamp(result)
  if (layout.space === 'srgb') {
    result = result.map((c) =>
      c === null ? c : Math.min(Math.max(c, 0), 1)
    ) as Coords
  }
  return { space: layout.space, coords: result, alpha }
}

/** Parses `color([from <color>] <space> channels... [/ alpha])`. */
function parseColorFunction(
  node: FunctionNode,
  currentColor: string | undefined
): Color | undefined {
  const relative = parseRelative(node, currentColor)
  if (!relative || relative.legacy) return
  const [spaceToken, ...tokens] = relative.tokens
  if (spaceToken?.type !== 'word') return
  const space = PREDEFINED_SPACES[spaceToken.value.toLowerCase()]
  if (!space) return
  const xyz = space.startsWith('xyz')
  const channel = { percent: 1 }
  return parseChannels(
    tokens,
    {
      space,
      channels: [channel, channel, channel],
      names: xyz ? ['x', 'y', 'z'] : ['r', 'g', 'b'],
    },
    relative.origin,
    false
  )
}

const HUE_METHODS = new Set(['shorter', 'longer', 'increasing', 'decreasing'])

/** Parses and computes `color-mix()`. */
function parseColorMix(
  node: FunctionNode,
  currentColor: string | undefined
): Color | undefined {
  const args = splitArguments(node)
  let space: Space = 'oklab'
  let hueMethod = 'shorter'
  const first = args[0]
  if (first[0]?.type === 'word' && first[0].value.toLowerCase() === 'in') {
    args.shift()
    const method = parseInterpolationMethod(
      first.map((token) => (token.type === 'word' ? token.value : ''))
    )
    if (!method) return
    space = method.space
    hueMethod = method.hue
  }
  if (args.length !== 2) return

  const items: { color: Color; percent?: number }[] = []
  for (const tokens of args) {
    if (tokens.length !== 1 && tokens.length !== 2) return
    let color: Color | undefined
    let percent: number | undefined
    for (const token of tokens) {
      const value =
        token.type === 'word' && token.value.endsWith('%')
          ? parseNumber(token.value, { percent: 100 })
          : undefined
      const math =
        value === undefined &&
        token.type === 'function' &&
        /^(calc|min|max|clamp)$/i.test(token.value)
          ? evaluate(token, { percent: 100 }, {})
          : undefined
      if (value !== undefined || math !== undefined) {
        if (percent !== undefined) return
        percent = value ?? math
      } else {
        if (color) return
        color = parseColorNode(token, currentColor)
        if (!color) return
      }
    }
    if (!color) return
    if (percent !== undefined && (percent < 0 || percent > 100)) return
    items.push({ color, percent })
  }

  let [p1, p2] = items.map((item) => item.percent)
  if (p1 === undefined && p2 === undefined) p1 = p2 = 50
  else if (p1 === undefined) p1 = 100 - p2
  else if (p2 === undefined) p2 = 100 - p1
  const sum = p1 + p2
  if (sum === 0) return
  const mixed = interpolate(items[0].color, items[1].color, p2 / sum, {
    space,
    hue: hueMethod,
  })
  // Percentages that add up to less than 100% make the result transparent.
  if (sum < 100 && mixed.alpha !== null) mixed.alpha *= sum / 100
  return mixed
}

export interface InterpolationMethod {
  space: Space
  hue: string
}

/**
 * Interpolates two colors with premultiplied alpha, `t` from 0 to 1.
 *
 * @see https://www.w3.org/TR/css-color-4/#interpolation
 */
function interpolate(
  colorA: Color,
  colorB: Color,
  t: number,
  { space, hue: hueMethod }: InterpolationMethod
): Color {
  const [a, b] = [colorA, colorB].map((color) => convert(color, space))
  const hueIndex = POLAR[space]
    ? space === 'hsl' || space === 'hwb'
      ? 0
      : 2
    : -1

  // Missing components take the value of the other color.
  const fill = (x: Coord, y: Coord) => (x === null ? y : x)
  const alphaA = fill(a.alpha, b.alpha)
  const alphaB = fill(b.alpha, a.alpha)
  const coordsA = a.coords.map((c, i) => fill(c, b.coords[i]))
  const coordsB = b.coords.map((c, i) => fill(c, a.coords[i]))

  if (hueIndex !== -1 && coordsA[hueIndex] !== null) {
    let h1 = coordsA[hueIndex]
    let h2 = coordsB[hueIndex]
    const diff = h2 - h1
    if (hueMethod === 'shorter') {
      if (diff > 180) h1 += 360
      else if (diff < -180) h2 += 360
    } else if (hueMethod === 'longer') {
      if (diff > 0 && diff < 180) h1 += 360
      else if (diff > -180 && diff <= 0) h2 += 360
    } else if (hueMethod === 'increasing') {
      if (diff < 0) h2 += 360
    } else if (diff > 0) {
      h1 += 360
    }
    coordsA[hueIndex] = h1
    coordsB[hueIndex] = h2
  }

  const alpha =
    alphaA === null ? null : alphaA + ((alphaB as number) - alphaA) * t
  const coords = coordsA.map((c, i) => {
    if (c === null) return null
    if (i === hueIndex || alpha === null) return c + (coordsB[i] - c) * t
    const mixed = c * alphaA + (coordsB[i] * alphaB - c * alphaA) * t
    return alpha === 0 ? mixed : mixed / alpha
  }) as Coords
  if (hueIndex !== -1 && coords[hueIndex] !== null) {
    coords[hueIndex] = normalizeHue(coords[hueIndex])
  }
  return { space, coords, alpha }
}

/**
 * Interpolates two colors, `t` from 0 to 1. Colors out of the sRGB gamut are
 * clipped after they're interpolated.
 */
export function mixColors(
  a: Color,
  b: Color,
  t: number,
  method: InterpolationMethod = { space: 'srgb', hue: 'shorter' }
): RGBA {
  return toRGBA(interpolate(a, b, t, method))
}

/**
 * Parses `in <space> [<hue-method> hue]`, the tokens of a color interpolation
 * method.
 */
export function parseInterpolationMethod(
  tokens: string[]
): InterpolationMethod | undefined {
  const [keyword, name, method, hue] = tokens.map((token) =>
    token.toLowerCase()
  )
  if (keyword !== 'in') return
  const space = (LAYOUTS[name]?.space || PREDEFINED_SPACES[name]) as Space
  if (!space) return
  if (tokens.length === 2) return { space, hue: 'shorter' }
  if (
    tokens.length === 4 &&
    POLAR[space] &&
    HUE_METHODS.has(method) &&
    hue === 'hue'
  ) {
    return { space, hue: method }
  }
}

function parseColorNode(
  node: Node | undefined,
  currentColor: string | undefined
): Color | undefined {
  if (!node) return
  if (node.type === 'word') {
    const lower = node.value.toLowerCase()
    if (lower === 'transparent') {
      return { space: 'srgb', coords: [0, 0, 0], alpha: 0 }
    }
    if (lower === 'currentcolor') {
      return currentColor && currentColor.toLowerCase() !== 'currentcolor'
        ? parseColorString(currentColor)
        : undefined
    }
    if (!/^#?[a-z0-9]+$/i.test(lower)) return
    const parsed = cssColorParse(lower)
    if (!parsed || parsed.type !== 'rgb') return
    return {
      space: 'srgb',
      coords: parsed.values.map((c) => c / 255) as Coords,
      alpha: parsed.alpha,
    }
  }
  if (node.type !== 'function') return
  const name = node.value.toLowerCase()
  if (name === 'color') return parseColorFunction(node, currentColor)
  if (name === 'color-mix') return parseColorMix(node, currentColor)
  if (name === 'light-dark') {
    // Without `color-scheme`, the light color is used.
    const args = splitArguments(node)
    if (args.length !== 2 || args.some((arg) => arg.length !== 1)) return
    return parseColorNode(args[0][0], currentColor)
  }
  const layout = LAYOUTS[name]
  if (!layout) return
  const relative = parseRelative(node, currentColor)
  if (!relative || (relative.legacy && !layout.allowLegacy)) return
  return parseChannels(
    relative.tokens,
    layout,
    relative.origin,
    relative.legacy
  )
}

function parseColorString(value: string, currentColor?: string) {
  const nodes = significant(valueParser(value.trim()).nodes)
  if (nodes.length !== 1) return
  return parseColorNode(nodes[0], currentColor)
}

const cache = new Map<string, Color | null>()

/** Parses a color. Returns `null` if the value isn't a color. */
export function parseCSSColor(
  value: string,
  currentColor?: string
): Color | null {
  if (typeof value !== 'string') return null
  const key = currentColor ? value + '\n' + currentColor : value
  let color = cache.get(key)
  if (color === undefined) {
    color = parseColorString(value, currentColor) || null
    if (cache.size > 1000) cache.clear()
    cache.set(key, color)
  }
  return color
}

/**
 * Parses a color to sRGB. Out of gamut colors are clipped. Returns `null` if
 * the value isn't a color.
 */
export function parseColor(value: string, currentColor?: string): RGBA | null {
  const color = parseCSSColor(value, currentColor)
  return color && toRGBA(color)
}

export function isColor(value: string): boolean {
  return parseColor(value, '#000') !== null
}

const round = (n: number) => Math.round(n * 1000) / 1000

export function serializeColor([r, g, b, a]: RGBA): string {
  const channels = [r, g, b].map(Math.round).join(',')
  return a === 1 ? `rgb(${channels})` : `rgba(${channels},${round(a)})`
}

const CONVERTED_FUNCTION =
  /^(hwb|lab|lch|oklab|oklch|color|color-mix|light-dark)$/

/**
 * Whether SVG renderers may not support a color function. Of `rgb()` and
 * `hsl()`, only the comma separated syntax of CSS Color 3 is kept.
 */
function needsConversion(node: FunctionNode) {
  const name = node.value.toLowerCase()
  if (CONVERTED_FUNCTION.test(name)) return true
  if (!/^(rgba?|hsla?)$/.test(name)) return false
  const tokens = significant(node.nodes)
  return !(
    (tokens.length === 5 || tokens.length === 7) &&
    tokens.every((token, i) =>
      i % 2
        ? isComma(token)
        : token.type === 'word' &&
          /^[+-]?(\d*\.)?\d+(e[+-]?\d+)?%?$/i.test(token.value)
    )
  )
}

const GRADIENT = /^(repeating-)?(linear|radial|conic)-gradient$/i

/**
 * Whether a gradient has a color that isn't in a legacy syntax (hex colors,
 * named colors, `rgb()`, `hsl()` and `hwb()`), so it's interpolated in Oklab.
 */
function hasNonLegacyColor(node: FunctionNode) {
  let found = false
  valueParser.walk(node.nodes, (child) => {
    if (found || child.type !== 'function') return !found && undefined
    const name = child.value.toLowerCase()
    if (name === 'url') return false
    if (/^(lab|lch|oklab|oklch|color|color-mix)$/.test(name)) {
      found = true
    } else if (/^(rgba?|hsla?|hwb)$/.test(name)) {
      const [first] = significant(child.nodes)
      found = first?.type === 'word' && first.value.toLowerCase() === 'from'
      return false
    }
  })
  return found
}

/**
 * Adds `in oklab` to a gradient with colors that aren't in a legacy syntax and
 * without an interpolation method, because they're converted to `rgb()`.
 *
 * @see https://www.w3.org/TR/css-images-4/#linear-gradient-syntax
 */
function addInterpolationMethod(node: FunctionNode) {
  const comma = node.nodes.findIndex(isComma)
  if (comma === -1) return
  const first = significant(node.nodes.slice(0, comma))
  if (
    first.some(
      (token) => token.type === 'word' && token.value.toLowerCase() === 'in'
    ) ||
    !hasNonLegacyColor(node)
  ) {
    return
  }
  const method = { type: 'word', value: 'in oklab' } as Node
  if (parseColorNode(first[0], '#000')) {
    // The first argument is a color stop.
    node.nodes.unshift(method, {
      type: 'div',
      value: ',',
      before: '',
      after: ' ',
    } as Node)
  } else {
    node.nodes.splice(comma, 0, { type: 'space', value: ' ' } as Node, method)
  }
}

const MAYBE_CONVERTED =
  /(hwb|lab|lch|oklab|oklch|color|color-mix|light-dark|rgba?|hsla?)\(/i

/**
 * Converts the colors in a CSS value that SVG renderers may not support, like
 * `oklch()` and `color-mix()`, to `rgb()` and `rgba()`. `onConvert` receives
 * each converted color with its original value.
 */
export function convertColors(
  value: string,
  currentColor?: string,
  onConvert?: (converted: string, original: string) => void
): string {
  if (!MAYBE_CONVERTED.test(value)) return value
  const parsed = valueParser(value)
  let changed = false
  parsed.walk((node) => {
    if (node.type !== 'function') return
    if (node.value.toLowerCase() === 'url') return false
    // Colors in gradients are converted when the gradient is drawn, with the
    // colors out of the sRGB gamut interpolated before they're clipped.
    if (GRADIENT.test(node.value)) {
      const before = valueParser.stringify(node)
      addInterpolationMethod(node)
      changed ||= valueParser.stringify(node) !== before
      return false
    }
    if (!needsConversion(node)) return
    const color = parseColorNode(node, currentColor)
    if (!color) return false
    const original = valueParser.stringify(node)
    const converted = serializeColor(toRGBA(color))
    onConvert?.(converted, original)
    const word = node as unknown as Node
    word.type = 'word'
    word.value = converted
    delete (word as Partial<FunctionNode>).nodes
    changed = true
    return false
  })
  return changed ? parsed.toString() : value
}
