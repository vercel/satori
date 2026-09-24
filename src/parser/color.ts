/**
 * Convert modern CSS Color 4 `oklch()` / `oklab()` notations into `rgb()` /
 * `rgba()` so the rest of the pipeline (and downstream SVG renderers such as
 * resvg) only ever has to deal with widely-supported color values.
 *
 * @see https://www.w3.org/TR/css-color-4/#ok-lab
 * @see https://github.com/vercel/satori/issues/637
 */

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Linear-light sRGB to gamma-encoded sRGB.
function gammaEncode(c: number): number {
  const abs = Math.abs(c)
  const sign = c < 0 ? -1 : 1
  if (abs <= 0.0031308) return c * 12.92
  return sign * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055)
}

// Convert an OKLab color (L in 0..1, a/b in the OKLab plane) to an sRGB triple
// in the 0..255 range.
export function oklabToRgb(
  L: number,
  a: number,
  b: number
): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b
  const s_ = L - 0.0894841775 * a - 1.291485548 * b

  const l = l_ * l_ * l_
  const m = m_ * m_ * m_
  const s = s_ * s_ * s_

  const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s

  return [
    clamp(Math.round(gammaEncode(rLin) * 255), 0, 255),
    clamp(Math.round(gammaEncode(gLin) * 255), 0, 255),
    clamp(Math.round(gammaEncode(bLin) * 255), 0, 255),
  ]
}

// Convert an OKLCH color (L in 0..1, chroma, hue in degrees) to an sRGB triple.
export function oklchToRgb(
  L: number,
  C: number,
  H: number
): [number, number, number] {
  const hRad = (H * Math.PI) / 180
  return oklabToRgb(L, C * Math.cos(hRad), C * Math.sin(hRad))
}

// Parse a single component. `none` resolves to 0 per the spec. Lightness and
// alpha accept percentages; the caller passes the reference range via `pct`.
function parseComponent(raw: string, pct: number): number {
  raw = raw.trim()
  if (!raw || raw === 'none') return 0
  if (raw.endsWith('%')) return (parseFloat(raw) / 100) * pct
  return parseFloat(raw)
}

function parseHue(raw: string): number {
  raw = raw.trim()
  if (!raw || raw === 'none') return 0
  const value = parseFloat(raw)
  if (raw.endsWith('turn')) return value * 360
  if (raw.endsWith('grad')) return value * 0.9
  if (raw.endsWith('rad')) return (value * 180) / Math.PI
  return value // deg or unitless
}

function toColorString(
  [r, g, b]: [number, number, number],
  alphaRaw: string | undefined
): string {
  if (typeof alphaRaw === 'undefined' || alphaRaw.trim() === '') {
    return `rgb(${r}, ${g}, ${b})`
  }
  const alpha = clamp(parseComponent(alphaRaw, 1), 0, 1)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// oklch( L C H [ / A ] ) / oklab( L a b [ / A ] ), components space-separated.
const OK_COLOR = /\bokl(ch|ab)\(\s*([^)]*?)\s*\)/gi

/**
 * Replace every `oklch()` / `oklab()` occurrence inside `value` with an
 * equivalent `rgb()` / `rgba()` string. Non-matching input is returned as-is,
 * and any component that fails to parse leaves that color untouched.
 */
export function normalizeModernColors(value: string): string {
  if (
    !value ||
    (value.indexOf('oklch') === -1 && value.indexOf('oklab') === -1)
  ) {
    return value
  }

  return value.replace(OK_COLOR, (match, kind: string, body: string) => {
    const [coords, alphaRaw] = body.split('/')
    const parts = coords.trim().split(/\s+/).filter(Boolean)
    if (parts.length < 3) return match

    const L = parseComponent(parts[0], 1)
    if (kind.toLowerCase() === 'ch') {
      const C = parseComponent(parts[1], 0.4)
      const H = parseHue(parts[2])
      return toColorString(oklchToRgb(L, C, H), alphaRaw)
    }
    const a = parseComponent(parts[1], 0.4)
    const b = parseComponent(parts[2], 0.4)
    return toColorString(oklabToRgb(L, a, b), alphaRaw)
  })
}
