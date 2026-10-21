/**
 * Renders a web page with Satori, like a screenshot: its HTML is fetched and
 * parsed, its stylesheets and fonts are loaded, and the tree is rendered to
 * SVG. Scripts don't run, so pages are rendered as their server sends them.
 *
 * Only used by `/api/screenshot` in development. CSS is scanned without
 * regular expressions, which could backtrack for a long time on large pages.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parse, type DefaultTreeAdapterTypes as Parsed } from 'parse5'
import satori from 'satori'
import { assertSafeServerFetchTarget } from '../../src/handler/url-safety'

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

// Limits on what a page can make the render fetch.
const MAX_STYLESHEETS = 40
const MAX_FONTS = 16
const MAX_BYTES = 10 * 1024 * 1024
const TIMEOUT = 10_000
const MAX_REDIRECTS = 10
const REDIRECTS = new Set([301, 302, 303, 307, 308])

/** A transparent image, for images without a source, e.g. lazy ones. */
const EMPTY_IMAGE =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/** Elements whose content isn't rendered, or that only matter to scripts. */
const SKIPPED = new Set(['script', 'noscript', 'template', 'meta', 'title'])

type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

interface Font {
  name: string
  data: ArrayBuffer
  weight: FontWeight
  style: 'normal' | 'italic'
}

interface Element {
  type: string
  props: Record<string, unknown>
}

export interface Screenshot {
  svg: string
  /** The time spent in each step, in ms. */
  timings: Record<string, number>
  stylesheets: { loaded: number; failed: string[] }
  fonts: { loaded: string[]; skipped: string[] }
  styleErrors: string[]
}

/**
 * Fetches a URL, and validates it and every redirect, as pages control the
 * URLs of their stylesheets and fonts. Like the images that Satori fetches,
 * they must resolve to public addresses, unless they're on `trusted`, the
 * origin of the URL that the developer entered, e.g. a local server.
 */
async function fetchResource(url: URL, accept: string, trusted: string) {
  let current = url
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.origin !== trusted) {
      try {
        await assertSafeServerFetchTarget(current.href)
      } catch {
        throw new Error(
          `Refused to fetch ${current}: it isn't public, or can't be resolved.`
        )
      }
    }
    let response: Response
    try {
      response = await fetch(current, {
        headers: { 'User-Agent': USER_AGENT, Accept: accept },
        signal: AbortSignal.timeout(TIMEOUT),
        redirect: 'manual',
      })
    } catch (error) {
      // The reason, e.g. a DNS error, is the cause of `fetch failed`.
      const cause = error instanceof Error ? error.cause ?? error : error
      const reason = cause instanceof Error ? cause.message : String(cause)
      throw new Error(`Couldn't fetch ${current}: ${reason}`)
    }
    const location = response.headers.get('location')
    if (REDIRECTS.has(response.status) && location) {
      await response.body?.cancel()
      current = new URL(location, current)
      continue
    }
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${current}`)
    }
    if (Number(response.headers.get('content-length')) > MAX_BYTES) {
      throw new Error(`Larger than ${MAX_BYTES} bytes: ${current}`)
    }
    const data = await response.arrayBuffer()
    if (data.byteLength > MAX_BYTES) {
      throw new Error(`Larger than ${MAX_BYTES} bytes: ${current}`)
    }
    return { data, url: current }
  }
  throw new Error(`Redirected too many times: ${url}`)
}

const decode = (data: ArrayBuffer) => new TextDecoder().decode(data)

/**
 * Stylesheets and fonts, by URL, and whether Satori can parse fonts. Their
 * URLs usually have hashes, so they're kept while the server runs, unlike the
 * pages.
 */
const cache = new Map<string, Promise<unknown>>()
const MAX_CACHED = 500

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let value = cache.get(key) as Promise<T> | undefined
  if (!value) {
    const oldest = cache.keys().next().value
    if (cache.size >= MAX_CACHED && oldest !== undefined) cache.delete(oldest)
    value = load()
    cache.set(key, value)
    // Failures are retried next time.
    value.catch(() => cache.delete(key))
  }
  return value
}

function resolve(url: string, base: URL) {
  try {
    return new URL(url, base).href
  } catch {
    return url
  }
}

/**
 * The URL of a `url()` that starts at `start`, and the index after it, or
 * `undefined` if it isn't closed.
 */
function readURL(css: string, start: number) {
  let i = start + 4
  while (css[i] === ' ' || css[i] === '\n' || css[i] === '\t') i++
  const quote = css[i] === '"' || css[i] === "'" ? css[i] : ''
  let url: string | undefined
  if (quote) {
    const close = css.indexOf(quote, i + 1)
    if (close === -1) return
    url = css.slice(i + 1, close)
    i = close + 1
  }
  const end = css.indexOf(')', i)
  if (end === -1) return
  url ??= css.slice(i, end).trim()
  return { url, end: end + 1 }
}

/** Makes the URLs of `url()` in CSS absolute, like browsers resolve them. */
function absoluteURLs(css: string, base: URL) {
  let result = ''
  let i = 0
  for (;;) {
    const start = css.indexOf('url(', i)
    if (start === -1) break
    const found = readURL(css, start)
    if (!found) break
    const { url, end } = found
    result += css.slice(i, start)
    result +=
      url.startsWith('data:') || url.startsWith('#')
        ? css.slice(start, end)
        : `url("${resolve(url, base)}")`
    i = end
  }
  return result + css.slice(i)
}

/** Splits CSS by `separator`, except in strings and parentheses. */
function splitCSS(css: string, separator: string) {
  const parts: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < css.length; i++) {
    const char = css[i]
    if (quote) {
      if (char === '\\') i++
      else if (char === quote) quote = ''
    } else if (char === '"' || char === "'") quote = char
    else if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === separator && !depth) {
      parts.push(css.slice(start, i))
      start = i + 1
    }
  }
  parts.push(css.slice(start))
  return parts
}

/** Declarations as an inline style of React, e.g. for the `style` attribute. */
function parseDeclarations(css: string) {
  const style: Record<string, string> = {}
  for (const declaration of splitCSS(css, ';')) {
    const colon = declaration.indexOf(':')
    if (colon < 0) continue
    const name = declaration.slice(0, colon).trim()
    const value = declaration.slice(colon + 1).trim()
    if (!name || !value) continue
    const key = name.startsWith('--')
      ? name
      : name
          .toLowerCase()
          .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    style[key] = value
  }
  return style
}

const unquote = (value: string) => value.trim().replace(/^(['"])(.*)\1$/, '$2')

/** Whether a `unicode-range` covers basic Latin, e.g. `U+0000-00FF`. */
function coversLatin(range: string | undefined) {
  if (!range) return true
  return range.split(',').some((part) => {
    const value = part.trim().replace(/^u\+/i, '')
    const [from, to = from]: string[] = value.includes('?')
      ? [value.replaceAll('?', '0'), value.replaceAll('?', 'F')]
      : value.split('-')
    return parseInt(from, 16) <= 0x41 && 0x41 <= parseInt(to, 16)
  })
}

/** A font weight of Satori: the default of a variable font, or the closest. */
function toWeight(value: string | undefined): FontWeight {
  const [from, to = from]: number[] = (value || '400')
    .trim()
    .split(/\s+/)
    .map((weight) =>
      weight === 'bold' ? 700 : weight === 'normal' ? 400 : Number(weight)
    )
  const weight = from <= 400 && 400 <= to ? 400 : from
  if (!Number.isFinite(weight)) return 400
  return (Math.min(9, Math.max(1, Math.round(weight / 100))) *
    100) as FontWeight
}

interface FontFace {
  family: string
  url: string
  weight: FontWeight
  style: 'normal' | 'italic'
}

/** The `@font-face` rules for basic Latin, with a format Satori can read. */
function findFontFaces(css: string, base: URL) {
  const faces: FontFace[] = []
  let i = 0
  for (;;) {
    i = css.indexOf('@font-face', i)
    if (i === -1) break
    const open = css.indexOf('{', i)
    const close = open === -1 ? -1 : css.indexOf('}', open)
    if (close === -1) break
    i = close + 1
    const face = parseDeclarations(css.slice(open + 1, close))
    if (!face.fontFamily || !face.src || !coversLatin(face.unicodeRange)) {
      continue
    }
    // The first source that is a font file, rather than a local font.
    for (const source of splitCSS(face.src, ',')) {
      const start = source.indexOf('url(')
      const format = /format\(\s*['"]?([\w-]+)/i.exec(source)?.[1].toLowerCase()
      if (start === -1) continue
      if (
        format &&
        !['woff2', 'woff', 'truetype', 'opentype'].includes(format)
      ) {
        continue
      }
      const found = readURL(source, start)
      if (!found) continue
      faces.push({
        family: unquote(face.fontFamily),
        url: found.url.startsWith('data:')
          ? found.url
          : resolve(found.url, base),
        weight: toWeight(face.fontWeight),
        style: /italic|oblique/i.test(face.fontStyle ?? '')
          ? 'italic'
          : 'normal',
      })
      break
    }
  }
  return faces
}

async function loadFont(url: string, trusted: string): Promise<ArrayBuffer> {
  if (url.startsWith('data:')) {
    const comma = url.indexOf(',')
    const data = Buffer.from(url.slice(comma + 1), 'base64')
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  }
  return cached(
    `font:${trusted}:${url}`,
    async () => (await fetchResource(new URL(url), '*/*', trusted)).data
  )
}

/** Whether Satori can parse a font, which throws for every render otherwise. */
function canParse(font: Font, url: string) {
  // Fonts in data URLs aren't cached, as their keys would be large.
  if (url.startsWith('data:')) return tryParse(font)
  return cached(`parse:${url}`, () => tryParse(font))
}

async function tryParse(font: Font) {
  try {
    await satori(
      {
        type: 'div',
        props: { style: { fontFamily: font.name }, children: 'a' },
      },
      { width: 10, height: 10, fonts: [font] }
    )
    return true
  } catch {
    return false
  }
}

let fallbackFonts: Promise<Font[]> | undefined

/** The fonts of the playground, loaded once they're needed. */
async function loadFallbackFonts(): Promise<Font[]> {
  const read = async (file: string) => {
    const data = await readFile(path.join(process.cwd(), 'public', file))
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
  }
  return [
    {
      name: 'Geist',
      data: await read('geist-400-normal.ttf'),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: await read('geist-700-normal.ttf'),
      weight: 700,
      style: 'normal',
    },
  ]
}

const isElement = (node: Parsed.Node): node is Parsed.Element =>
  'tagName' in node

function attribute(element: Parsed.Element, name: string) {
  return element.attrs.find((attr) => attr.name === name)?.value
}

function isStylesheet(element: Parsed.Element) {
  const rel = attribute(element, 'rel')?.toLowerCase().split(/\s+/) ?? []
  return (
    element.tagName === 'link' &&
    rel.includes('stylesheet') &&
    !rel.includes('alternate') &&
    !!attribute(element, 'href')
  )
}

function* walk(node: Parsed.Node): Generator<Parsed.Element> {
  if (!('childNodes' in node)) return
  for (const child of node.childNodes) {
    if (!isElement(child)) continue
    yield child
    if (!SKIPPED.has(child.tagName)) yield* walk(child)
  }
}

/** A length of `sizes` in px, e.g. `50vw` or `calc(100vw - 2rem)`. */
function toPx(length: string, viewport: number): number | undefined {
  const value = length.trim().toLowerCase()
  const math = /^calc\((.*)\)$/.exec(value)
  if (math) {
    // Sums and differences of lengths.
    let total = 0
    for (const [, sign, term] of `+ ${math[1]}`.matchAll(
      /([+-])\s+([^\s]+)/g
    )) {
      const px = toPx(term, viewport)
      if (px === undefined) return undefined
      total += sign === '-' ? -px : px
    }
    return total
  }
  const match = /^(-?[\d.]+)(px|vw|r?em)?$/.exec(value)
  if (!match) return undefined
  const number = parseFloat(match[1])
  if (match[2] === 'vw') return (number * viewport) / 100
  if (match[2] === 'em' || match[2] === 'rem') return number * 16
  return match[2] === 'px' || number === 0 ? number : undefined
}

/** Whether a media condition of `sizes` matches, with widths only. */
function matchesWidth(condition: string, viewport: number) {
  return condition
    .toLowerCase()
    .split(/\s+and\s+/)
    .every((part) => {
      const match = /^\(\s*(min|max)-width\s*:\s*([^)]+)\)$/.exec(part.trim())
      if (!match) return false
      const width = toPx(match[2], viewport)
      if (width === undefined) return false
      return match[1] === 'min' ? viewport >= width : viewport <= width
    })
}

/** The width of an image from its `sizes`, like in browsers. */
function sourceSize(sizes: string | undefined, viewport: number) {
  for (const entry of splitCSS(sizes ?? '', ',')) {
    const match = /^(.*?)\s*(calc\(.*\)|[^\s()]+)$/i.exec(entry.trim())
    if (!match) continue
    if (match[1] && !matchesWidth(match[1], viewport)) continue
    const size = toPx(match[2], viewport)
    if (size !== undefined && size >= 0) return size
  }
  return viewport
}

/**
 * The source of an image from its `srcset`, like in browsers on a display
 * with 1 pixel per CSS pixel: the smallest that's at least as dense. Next.js
 * images have the largest one as their `src`.
 */
function pickSource(
  srcset: string,
  src: string | undefined,
  sizes: string | undefined,
  viewport: number
) {
  const candidates: { url: string; width?: number; density?: number }[] = []
  for (const [, url, descriptor = ''] of srcset.matchAll(
    /\s*([^\s,][^\s]*?),?(?:\s+([^,]*))?(?:,|$)/g
  )) {
    const width = /^(\d+)w$/.exec(descriptor.trim())
    const density = /^([\d.]+)x$/.exec(descriptor.trim())
    candidates.push({
      url,
      width: width ? Number(width[1]) : undefined,
      density: density ? Number(density[1]) : width ? undefined : 1,
    })
  }
  const size = sourceSize(sizes, viewport)
  const withWidths = candidates.some((candidate) => candidate.width)
  for (const candidate of candidates) {
    if (candidate.width) candidate.density = candidate.width / (size || 1)
  }
  // Without widths, `src` is the 1x source.
  if (src && !withWidths && !candidates.some((c) => c.density === 1)) {
    candidates.push({ url: src, density: 1 })
  }
  const usable = candidates.filter((c) => c.density && c.density > 0)
  if (!usable.length) return src
  usable.sort((a, b) => a.density! - b.density!)
  return (usable.find((c) => c.density! >= 1) ?? usable[usable.length - 1]).url
}

/**
 * Converts parsed HTML to elements for Satori. Stylesheets are inlined where
 * they're linked, so that they apply in the same order, and the URLs of images
 * are made absolute.
 */
function convert(
  node: Parsed.Element,
  base: URL,
  stylesheets: Map<Parsed.Element, string>,
  viewport: number
): Element {
  if (isStylesheet(node)) {
    const media = attribute(node, 'media')
    return {
      type: 'style',
      props: {
        ...(media ? { media } : {}),
        children: stylesheets.get(node) ?? '',
      },
    }
  }
  const props: Record<string, unknown> = {}
  for (const { name, value } of node.attrs) {
    if (name.startsWith('on')) continue
    if (name === 'class') props.className = value
    else if (name === 'style') {
      props.style = parseDeclarations(absoluteURLs(value, base))
    } else if (
      (name === 'src' || name === 'href' || name === 'xlink:href') &&
      ['img', 'image', 'source'].includes(node.tagName)
    ) {
      props[name] = resolve(value, base)
    } else props[name] = value
  }
  // An image uses the source of its `srcset` that browsers would use, which
  // is usually much smaller than its `src`. Without either, e.g. before a
  // script loads it, it's empty, like in browsers, where Satori would throw.
  const srcset = attribute(node, 'srcset')?.trim()
  if (node.tagName === 'img') {
    const source = srcset
      ? pickSource(
          srcset,
          attribute(node, 'src'),
          attribute(node, 'sizes'),
          viewport
        )
      : undefined
    if (source) props.src = resolve(source, base)
    if (!props.src) props.src = EMPTY_IMAGE
  }
  const children: (Element | string)[] = []
  for (const child of node.childNodes) {
    if (child.nodeName === '#text')
      children.push((child as Parsed.TextNode).value)
    else if (isElement(child)) {
      const keep =
        !SKIPPED.has(child.tagName) &&
        (child.tagName !== 'link' || isStylesheet(child)) &&
        child.tagName !== 'base'
      if (keep) children.push(convert(child, base, stylesheets, viewport))
    }
  }
  if (children.length) props.children = children
  return { type: node.tagName, props }
}

export async function screenshot(
  url: URL,
  { width, height }: { width: number; height: number }
): Promise<Screenshot> {
  const timings: Record<string, number> = {}
  const time = async <T>(name: string, task: () => Promise<T>) => {
    const start = performance.now()
    try {
      return await task()
    } finally {
      timings[name] = performance.now() - start
    }
  }

  // Only the origin of the URL that was entered may be private, see
  // `fetchResource()`.
  const trusted = url.origin
  const page = await time('page', () =>
    fetchResource(url, 'text/html', trusted)
  )
  const document = parse(decode(page.data))
  const html = document.childNodes.find(
    (node): node is Parsed.Element => isElement(node) && node.tagName === 'html'
  )
  if (!html) throw new Error('The page has no <html> element.')

  const elements = [...walk(html)]
  const baseHref = elements.find((element) => element.tagName === 'base')
  const base = new URL(
    resolve(attribute(baseHref ?? html, 'href') ?? '', page.url)
  )

  // Stylesheets, in parallel, with their URLs made absolute.
  const linked = elements.filter(isStylesheet).slice(0, MAX_STYLESHEETS)
  const failed: string[] = []
  const stylesheets = new Map<Parsed.Element, string>()
  await time('stylesheets', () =>
    Promise.all(
      linked.map(async (link) => {
        const href = new URL(attribute(link, 'href') ?? '', base)
        try {
          const css = await cached(`css:${trusted}:${href}`, async () => {
            const sheet = await fetchResource(href, 'text/css', trusted)
            return absoluteURLs(decode(sheet.data), sheet.url)
          })
          stylesheets.set(link, css)
        } catch {
          failed.push(href.href)
        }
      })
    )
  )
  for (const style of elements.filter(
    (element) => element.tagName === 'style'
  )) {
    const text = style.childNodes[0]
    if (text?.nodeName === '#text') {
      const node = text as Parsed.TextNode
      node.value = absoluteURLs(node.value, base)
    }
  }

  // Fonts of `@font-face` rules that Satori can parse.
  const css = [
    ...stylesheets.values(),
    ...elements
      .filter((element) => element.tagName === 'style')
      .map((style) => (style.childNodes[0] as Parsed.TextNode)?.value ?? ''),
  ].join('\n')
  const faces = findFontFaces(css, base).slice(0, MAX_FONTS)
  const loaded: string[] = []
  const skipped: string[] = []
  const pageFonts = await time('fonts', async () => {
    const data = new Map<string, Promise<ArrayBuffer | undefined>>()
    const fonts = await Promise.all(
      faces.map(async (face): Promise<Font | undefined> => {
        if (!data.has(face.url)) {
          data.set(
            face.url,
            loadFont(face.url, trusted).catch(() => undefined)
          )
        }
        const fontData = await data.get(face.url)
        const label = `${face.family} ${face.weight}${
          face.style === 'italic' ? ' italic' : ''
        }`
        const font: Font | undefined = fontData && {
          name: face.family,
          data: fontData,
          weight: face.weight,
          style: face.style,
        }
        if (font && (await canParse(font, face.url))) {
          loaded.push(label)
          return font
        }
        skipped.push(label)
      })
    )
    return fonts.filter((font): font is Font => !!font)
  })

  const tree = convert(html, base, stylesheets, width)
  const styleErrors: string[] = []
  // The fallback fonts come first, so that unknown families use them.
  fallbackFonts ??= loadFallbackFonts()
  const fonts = [...(await fallbackFonts), ...pageFonts]
  const svg = await time(
    'satori',
    (): Promise<string> =>
      satori(tree, {
        width,
        height,
        fonts,
        onStyleError: (error: Error) => styleErrors.push(error.message),
      })
  )

  return {
    svg,
    timings,
    stylesheets: { loaded: stylesheets.size, failed },
    fonts: { loaded, skipped },
    styleErrors,
  }
}
