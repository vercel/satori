/**
 * The `@font-face` rules of stylesheets. Like in browsers, the fonts of the
 * families that text uses are loaded, before layout, unless fonts of the same
 * family are passed in the `fonts` option, which take precedence.
 */

import type { ReactElement, ReactNode } from 'react'

import type { FontOptions, FontStyle, Weight } from './font.js'
import { parseFontShorthand } from './parser/font.js'
import { safeServerFetch } from './handler/url-safety.js'
import { createLRU } from './utils.js'

export interface FontFace {
  /** The family, as it's declared. */
  family: string
  /** The URLs of the sources Satori can read, in order. */
  sources: string[]
  weight: Weight
  style: FontStyle
  /** The code points it's used for, from `unicode-range`. */
  ranges?: [number, number][]
}

/** Formats of sources that Satori can read. */
const FORMATS = new Set([
  'woff2',
  'woff',
  'truetype',
  'opentype',
  'woff2-variations',
  'woff-variations',
  'truetype-variations',
  'opentype-variations',
])

/** Splits a list at the commas that aren't in functions or strings. */
function splitList(value: string) {
  const parts: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (quote) {
      if (char === '\\') i++
      else if (char === quote) quote = ''
    } else if (char === '"' || char === "'") quote = char
    else if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ',' && depth === 0) {
      parts.push(value.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(value.slice(start).trim())
  return parts.filter(Boolean)
}

const unquote = (value: string) =>
  value.trim().replace(/^(['"])([\s\S]*)\1$/, '$2')

/** The families of `font-family`, in lowercase. */
export function parseFamilies(value: string) {
  return splitList(value).map((family) => unquote(family).toLowerCase())
}

/** A weight of Satori: 400 if a range has it, or else the closest one. */
function parseWeight(value: string | undefined): Weight {
  const weights = (value || 'normal')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((weight) =>
      weight === 'bold' ? 700 : weight === 'normal' ? 400 : Number(weight)
    )
  const [from, to = from] = weights
  const weight = from <= 400 && 400 <= to ? 400 : from
  if (!Number.isFinite(weight)) return 400
  return (Math.min(9, Math.max(1, Math.round(weight / 100))) * 100) as Weight
}

/** The ranges of `unicode-range`, e.g. `U+0000-00FF` or `U+4??`. */
function parseRanges(value: string | undefined) {
  if (!value) return undefined
  const ranges: [number, number][] = []
  for (const part of splitList(value)) {
    const match = /^u\+([0-9a-f?]{1,6})(?:-([0-9a-f]{1,6}))?$/i.exec(part)
    if (!match) continue
    const [, start, end] = match
    if (start.includes('?')) {
      ranges.push([
        parseInt(start.replace(/\?/g, '0'), 16),
        parseInt(start.replace(/\?/g, 'f'), 16),
      ])
    } else {
      ranges.push([parseInt(start, 16), parseInt(end ?? start, 16)])
    }
  }
  return ranges.length ? ranges : undefined
}

/** The URLs of `src` that Satori can read, skipping `local()` sources. */
function parseSources(value: string) {
  const sources: string[] = []
  for (const source of splitList(value)) {
    const url = /^url\(\s*(?:(['"])([\s\S]*?)\1|([^)\s]*))\s*\)/i.exec(source)
    if (!url) continue
    const format = /\bformat\(\s*['"]?([\w-]+)/i.exec(source)?.[1]
    if (format && !FORMATS.has(format.toLowerCase())) continue
    const href = (url[2] ?? url[3]).trim()
    // Other URLs can't be resolved, as stylesheets don't have a base URL.
    if (/^(https?:|data:)/i.test(href)) sources.push(href)
  }
  return sources
}

/** A `@font-face` rule from its descriptors, if it's valid. */
export function parseFontFace(descriptors: unknown[]): FontFace | undefined {
  const values = new Map<string, string>()
  for (const item of descriptors) {
    if (Array.isArray(item)) {
      values.set(String(item[0]).toLowerCase(), String(item[1]))
    }
  }
  const family = values.get('font-family')
  const src = values.get('src')
  if (!family || !src) return
  const sources = parseSources(src)
  if (!sources.length) return
  return {
    family: unquote(family),
    sources,
    weight: parseWeight(values.get('font-weight')),
    style: /^(italic|oblique)/i.test(values.get('font-style')?.trim() ?? '')
      ? 'italic'
      : 'normal',
    ranges: parseRanges(values.get('unicode-range')),
  }
}

/** Elements whose text isn't rendered. */
const HIDDEN_TEXT = new Set(['style', 'script', 'title', 'head', 'template'])

/**
 * The text of each family, by the `font-family` that elements inherit, from
 * their styles after stylesheets are applied. Text with a family that isn't
 * known yet, e.g. from `var()`, counts for every family.
 */
export function getTextByFamily(root: ReactNode) {
  const text = new Map<string, string>()
  const ANY = '\0any'
  const add = (families: string[], content: string) => {
    for (const family of families) {
      text.set(family, (text.get(family) ?? '') + content)
    }
  }
  const visit = (node: ReactNode, families: string[]) => {
    if (node === null || node === undefined || typeof node === 'boolean') {
      return
    }
    if (typeof node === 'string' || typeof node === 'number') {
      add(families, String(node))
      return
    }
    if (Array.isArray(node)) {
      for (const child of node) visit(child, families)
      return
    }
    const { type, props } = node as ReactElement<any>
    if (!props || HIDDEN_TEXT.has(type as string)) return
    const style = props.style ?? {}
    let family: unknown = style.fontFamily
    if (family === undefined && typeof style.font === 'string') {
      try {
        family = parseFontShorthand(style.font).fontFamily
      } catch {
        // An invalid shorthand doesn't apply.
      }
    }
    if (typeof family === 'string') {
      families = family.includes('var(') ? [ANY] : parseFamilies(family)
    }
    // The text of form controls.
    for (const key of ['value', 'defaultValue', 'placeholder']) {
      if (typeof props[key] === 'string') add(families, props[key])
    }
    visit(props.children, families)
  }
  visit(root, [])
  const any = text.get(ANY)
  text.delete(ANY)
  return { text, any }
}

/** Whether text has a code point in any of the ranges. */
function inRanges(content: string, ranges: [number, number][]) {
  for (const char of content) {
    const code = char.codePointAt(0)
    if (ranges.some(([start, end]) => start <= code && code <= end)) {
      return true
    }
  }
  return false
}

/** Fonts that were loaded, by URL, also for later renders. */
const fontData = createLRU<Promise<ArrayBuffer | undefined>>(100)

/** Whether data is a font Satori can read, from its signature. */
function isFont(data: ArrayBuffer) {
  if (data.byteLength < 4) return false
  const signature = new DataView(data).getUint32(0)
  return [
    0x00010000, // TrueType
    0x4f54544f, // OTTO
    0x74727565, // true
    0x774f4646, // wOFF
    0x774f4632, // wOF2
  ].includes(signature)
}

async function loadSource(url: string): Promise<ArrayBuffer | undefined> {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',')
    if (comma === -1) return
    const meta = url.slice(5, comma)
    const content = url.slice(comma + 1)
    const bytes = /;base64$/i.test(meta)
      ? Uint8Array.from(atob(content), (char) => char.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(content))
    return bytes.buffer
  }
  // Like images, fonts are only loaded from public addresses on servers.
  const response =
    typeof window === 'undefined'
      ? await safeServerFetch(url)
      : await fetch(url)
  if (response.ok === false) return
  return response.arrayBuffer()
}

/** Loads a font from the first of its sources that works, like browsers. */
async function loadFontFace(face: FontFace) {
  for (const url of face.sources) {
    let promise = fontData.get(url)
    if (!promise) {
      promise = loadSource(url).catch(() => undefined)
      // Data URLs aren't cached, as their keys would be large.
      if (!url.startsWith('data:')) fontData.set(url, promise)
    }
    const data = await promise
    if (data && isFont(data)) return data
  }
}

/**
 * Loads the fonts of `@font-face` rules that text uses, by their families and
 * `unicode-range`, except the families of the `fonts` option.
 */
export async function loadFontFaces(
  faces: FontFace[],
  root: ReactNode,
  provided: Set<string>
): Promise<FontOptions[]> {
  const { text, any } = getTextByFamily(root)
  const used = faces.filter((face) => {
    const family = face.family.toLowerCase()
    if (provided.has(family)) return false
    const content = (text.get(family) ?? '') + (any ?? '')
    if (!content.trim()) return false
    return !face.ranges || inRanges(content, face.ranges)
  })
  const fonts = await Promise.all(
    used.map(async (face): Promise<FontOptions | undefined> => {
      const data = await loadFontFace(face)
      return (
        data && {
          name: face.family,
          data,
          weight: face.weight,
          style: face.style,
        }
      )
    })
  )
  return fonts.filter(Boolean)
}
