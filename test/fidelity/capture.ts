/**
 * Captures the sections of `cases.ts` from the live pages into static
 * snapshots, and renders them with Chrome as the references of the benchmark:
 *
 *   pnpm fidelity:capture [names...]              capture and render
 *   pnpm fidelity:capture --reference [names...]  only render the references
 *
 * Requires Chrome, see `chrome.ts`.
 */

import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

import { Browser, type Page } from './chrome.ts'
import { cases } from './cases.ts'
import {
  casesDir,
  readSnapshot,
  toHTML,
  type FidelityCase,
  type Snapshot,
  type SnapshotNode,
} from './snapshot.ts'

/**
 * Runs in the page: the section with its ancestors, without their siblings,
 * and the style rules that match any of them.
 */
async function captureInPage(selector: string) {
  const section = document.querySelector(selector)
  if (!section) throw new Error(`Nothing matches ${selector}`)
  section.scrollIntoView()
  await new Promise((resolve) => setTimeout(resolve, 1500))
  scrollTo(0, 0)
  await new Promise((resolve) => setTimeout(resolve, 500))

  const SKIPPED = new Set([
    'script',
    'noscript',
    'template',
    'link',
    'meta',
    'title',
    'base',
    'source',
    'iframe',
    'video',
    'audio',
    'canvas',
    'object',
    'embed',
    'slot',
  ])
  const DROPPED_ATTRIBUTES = new Set([
    'srcset',
    'sizes',
    'loading',
    'decoding',
    'fetchpriority',
    'nonce',
  ])
  const kept: Element[] = []
  const attributes = (element: Element) => {
    const result: Record<string, string> = {}
    for (const { name, value } of element.attributes) {
      if (/^on/i.test(name) || DROPPED_ATTRIBUTES.has(name)) continue
      result[name] = value
    }
    // The absolute URL of the image, even if it wasn't loaded.
    if (
      element instanceof HTMLImageElement &&
      (element.currentSrc || element.src)
    ) {
      result.src = element.currentSrc || element.src
    }
    return result
  }
  const serialize = (element: Element): any => {
    kept.push(element)
    const children: any[] = []
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        if ((child as Text).data) children.push((child as Text).data)
      } else if (
        child.nodeType === Node.ELEMENT_NODE &&
        !SKIPPED.has((child as Element).localName)
      ) {
        children.push(serialize(child as Element))
      }
    }
    return [element.localName, attributes(element), children]
  }
  let root = serialize(section)
  let depth = 0
  for (let parent = section.parentElement; parent; ) {
    kept.push(parent)
    root = [parent.localName, attributes(parent), [root]]
    parent = parent.parentElement
    if (parent && parent !== document.documentElement) depth++
  }

  // Selectors are matched without pseudo-elements, which `matches()` rejects.
  const PSEUDO_ELEMENT =
    /::?(before|after|marker|placeholder|selection|first-line|first-letter|backdrop|file-selector-button)\b|::[-\w]+/g
  const splitList = (list: string) => {
    const parts: string[] = []
    let nesting = 0
    let start = 0
    for (let i = 0; i < list.length; i++) {
      if (list[i] === '(' || list[i] === '[') nesting++
      else if (list[i] === ')' || list[i] === ']') nesting--
      else if (list[i] === ',' && !nesting) {
        parts.push(list.slice(start, i))
        start = i + 1
      }
    }
    return [...parts, list.slice(start)]
  }
  const matchesAny = (selectorText: string) =>
    splitList(selectorText).some((part) => {
      const plain = part.replace(PSEUDO_ELEMENT, '').trim() || '*'
      try {
        return kept.some((element) => element.matches(plain))
      } catch {
        return false
      }
    })
  const absolute = (css: string, base: string) =>
    css.replace(
      /url\(\s*(['"]?)([^'")]+)\1\s*\)/g,
      (match, _quote, url: string) =>
        url.startsWith('data:') ? match : `url("${new URL(url, base).href}")`
    )
  const prune = (rules: CSSRuleList, base: string): string => {
    let css = ''
    for (const rule of rules) {
      if (rule instanceof CSSStyleRule) {
        if (matchesAny(rule.selectorText)) {
          css += absolute(rule.cssText, base) + '\n'
        }
      } else if (rule instanceof CSSImportRule) {
        if (rule.styleSheet) {
          css += prune(rule.styleSheet.cssRules, rule.styleSheet.href ?? base)
        }
      } else if (rule instanceof CSSLayerStatementRule) {
        css += rule.cssText + '\n'
      } else if (
        rule instanceof CSSMediaRule ||
        rule instanceof CSSSupportsRule ||
        rule instanceof CSSLayerBlockRule ||
        rule instanceof CSSContainerRule
      ) {
        const inner = prune(rule.cssRules, base)
        if (!inner) continue
        const prelude =
          rule instanceof CSSMediaRule
            ? `@media ${rule.conditionText}`
            : rule instanceof CSSSupportsRule
            ? `@supports ${rule.conditionText}`
            : rule instanceof CSSLayerBlockRule
            ? `@layer ${rule.name}`
            : `@container ${rule.conditionText}`
        css += `${prelude} {\n${inner}}\n`
      }
      // `@font-face`, `@keyframes` and other at-rules are dropped: fonts are
      // provided by the cases, and animations are stopped.
    }
    return css
  }
  let css = ''
  let skippedSheets = 0
  for (const sheet of [
    ...document.styleSheets,
    ...document.adoptedStyleSheets,
  ]) {
    if (sheet.disabled) continue
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      skippedSheets++
      continue
    }
    const inner = prune(rules, sheet.href ?? document.baseURI)
    const media = sheet.media?.mediaText
    css += media && media !== 'all' ? `@media ${media} {\n${inner}}\n` : inner
  }
  return { root, depth, css, skippedSheets }
}

const IMAGE_ACCEPT =
  'image/png,image/jpeg,image/gif,image/svg+xml;q=0.9,*/*;q=0.1'

/** Fetches an image as a data URL, as PNG if Satori can't decode its type. */
async function toDataURL(url: string, cache: Map<string, Promise<string>>) {
  if (!cache.has(url)) {
    cache.set(
      url,
      (async () => {
        const response = await fetch(url, { headers: { accept: IMAGE_ACCEPT } })
        if (!response.ok) throw new Error(`${response.status} for ${url}`)
        let type = response.headers.get('content-type')?.split(';')[0] ?? ''
        let data = Buffer.from(await response.arrayBuffer())
        if (!/^image\/(png|jpeg|gif|svg\+xml)$/.test(type)) {
          data = await sharp(data).png().toBuffer()
          type = 'image/png'
        }
        return `data:${type};base64,${data.toString('base64')}`
      })()
    )
  }
  return cache.get(url)!
}

/** Inlines the images of `<img>` and of `url()` in the CSS. */
async function inlineImages(root: SnapshotNode, css: string) {
  const cache = new Map<string, Promise<string>>()
  const inline = async (url: string) => {
    try {
      return await toDataURL(url, cache)
    } catch (error) {
      console.warn(`  Couldn't inline ${url}: ${(error as Error).message}`)
      return url
    }
  }
  const visit = async (node: SnapshotNode) => {
    if (typeof node === 'string') return
    const [tag, attributes, children] = node
    if (tag === 'img' && /^https?:/.test(attributes.src ?? '')) {
      attributes.src = await inline(attributes.src)
    }
    await Promise.all(children.map(visit))
  }
  await visit(root)
  const urls = [...css.matchAll(/url\("(https?:[^"]+)"\)/g)].map((m) => m[1])
  for (const url of new Set(urls)) {
    css = css.split(`url("${url}")`).join(`url("${await inline(url)}")`)
  }
  return css
}

async function capture(page: Page, testCase: FidelityCase): Promise<Snapshot> {
  await page.setViewport(testCase.width, 900)
  await page.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-reduced-motion', value: 'reduce' },
      { name: 'prefers-color-scheme', value: 'light' },
    ],
  })
  await page.goto(testCase.url)
  await new Promise((resolve) => setTimeout(resolve, 3000))
  const { root, depth, css, skippedSheets } = await page.evaluate(
    `(${captureInPage.toString()})(${JSON.stringify(testCase.selector)})`
  )
  if (skippedSheets) {
    console.warn(`  Skipped ${skippedSheets} cross-origin stylesheets`)
  }
  return {
    url: testCase.url,
    selector: testCase.selector,
    capturedAt: new Date().toISOString(),
    width: testCase.width,
    height: 0,
    root,
    depth,
    css: await inlineImages(root, css),
  }
}

/** Renders a snapshot with Chrome, returning the image and its height. */
async function renderReference(
  page: Page,
  snapshot: Snapshot,
  testCase: FidelityCase
) {
  const dir = mkdtempSync(join(tmpdir(), 'satori-fidelity-'))
  try {
    const file = join(dir, 'index.html')
    writeFileSync(file, toHTML(snapshot, testCase.fonts))
    await page.setViewport(snapshot.width, 800)
    await page.goto(pathToFileURL(file).href)
    // The image ends at the bottom of the section.
    const measure = () =>
      page.evaluate<number>(`(async () => {
        await document.fonts.ready
        await Promise.all([...document.images].map((image) => image.decode().catch(() => {})))
        await new Promise(requestAnimationFrame)
        let section = document.body.firstElementChild
        for (let i = 0; i < ${snapshot.depth}; i++) section = section.firstElementChild
        return Math.ceil(section.getBoundingClientRect().bottom)
      })()`)
    // Viewport units resolve against the size of the image, as in Satori, so
    // the height is measured until it's stable.
    let height = await measure()
    for (let i = 0; i < 3; i++) {
      await page.setViewport(snapshot.width, height)
      const next = await measure()
      if (next === height) break
      height = next
    }
    return { image: await page.screenshot(snapshot.width, height), height }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const args = process.argv.slice(2)
const referenceOnly = args.includes('--reference')
const names = args.filter((arg) => !arg.startsWith('--'))
const selected = names.length
  ? cases.filter((testCase) => names.includes(testCase.name))
  : cases

const browser = await Browser.launch()
try {
  const page = await browser.newPage()
  for (const testCase of selected) {
    console.log(testCase.name)
    const dir = join(casesDir, testCase.name)
    mkdirSync(dir, { recursive: true })
    const snapshot = referenceOnly
      ? readSnapshot(testCase.name)
      : await capture(page, testCase)
    const { image, height } = await renderReference(page, snapshot, testCase)
    snapshot.height = height
    writeFileSync(join(dir, 'snapshot.json'), JSON.stringify(snapshot) + '\n')
    writeFileSync(join(dir, 'chrome.png'), image)
    console.log(
      `  ${snapshot.width}x${height}, ${(
        JSON.stringify(snapshot).length / 1024
      ).toFixed(0)} KB`
    )
  }
} finally {
  await browser.close()
}
