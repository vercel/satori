/**
 * Snapshots of real website sections, as static DOM trees with the CSS that
 * applies to them, so that Chrome and Satori render the same input.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/** An element of a snapshot: its tag, attributes and children. */
export type SnapshotElement = [
  tag: string,
  attributes: Record<string, string>,
  children: SnapshotNode[]
]
/** Text, or an element. */
export type SnapshotNode = string | SnapshotElement

export interface Snapshot {
  url: string
  selector: string
  capturedAt: string
  /** The width of the viewport. */
  width: number
  /** The height of the snapshot in Chrome, which is the size of the image. */
  height: number
  /** The `<html>` element, with the ancestors of the section in `<body>`. */
  root: SnapshotElement
  /** The number of ancestors of the section in `<body>`. */
  depth: number
  /** The style rules that match elements of the snapshot. */
  css: string
}

/** A font file for a font family of a page. */
export interface FontFile {
  family: string
  file: string
  weight: number
  style?: 'normal' | 'italic'
}

export interface FidelityCase {
  name: string
  url: string
  /** The section to capture. */
  selector: string
  width: number
  fonts: FontFile[]
}

const ROOT = join(import.meta.dirname, '..', '..')

export const casesDir = join(import.meta.dirname, 'cases')

export function readSnapshot(name: string): Snapshot {
  return JSON.parse(readFileSync(join(casesDir, name, 'snapshot.json'), 'utf8'))
}

/** The font data of a case, for Satori. */
export function loadFonts(fonts: FontFile[]) {
  return fonts.map(({ family, file, weight, style }) => ({
    name: family,
    data: readFileSync(join(ROOT, file)),
    weight: weight as any,
    style: style ?? 'normal',
  }))
}

/** Stops animations and transitions, which Satori doesn't run. */
const STATIC_CSS =
  '*, ::before, ::after { animation: none !important; transition: none !important }'

const VOID_ELEMENTS = new Set([
  'area',
  'br',
  'col',
  'hr',
  'img',
  'input',
  'source',
  'wbr',
])

const escapeText = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escapeAttribute = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/"/g, '&quot;')

function toHTMLNode(node: SnapshotNode, raw = false): string {
  if (typeof node === 'string') return raw ? node : escapeText(node)
  const [tag, attributes, children] = node
  const attrs = Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join('')
  if (VOID_ELEMENTS.has(tag)) return `<${tag}${attrs}>`
  const content = children
    .map((child) => toHTMLNode(child, tag === 'style'))
    .join('')
  return `<${tag}${attrs}>${content}</${tag}>`
}

/** The HTML document of a snapshot for Chrome, with the fonts of the case. */
export function toHTML(snapshot: Snapshot, fonts: FontFile[]) {
  const fontFaces = fonts
    .map(
      ({ family, file, weight, style }) =>
        `@font-face { font-family: "${family}"; src: url("${
          pathToFileURL(join(ROOT, file)).href
        }"); font-weight: ${weight}; font-style: ${style ?? 'normal'} }`
    )
    .join('\n')
  const [, attributes, children] = snapshot.root
  const head: SnapshotElement = [
    'head',
    {},
    [
      ['meta', { charset: 'utf-8' }, []],
      ['style', {}, [fontFaces + '\n' + STATIC_CSS + '\n' + snapshot.css]],
    ],
  ]
  return (
    '<!doctype html>' + toHTMLNode(['html', attributes, [head, ...children]])
  )
}

/** Splits an inline style into declarations, outside of strings and `()`. */
export function parseInlineStyle(style: string) {
  const result: Record<string, string> = {}
  let depth = 0
  let quote = ''
  let start = 0
  const declarations: string[] = []
  for (let i = 0; i < style.length; i++) {
    const char = style[i]
    if (quote) {
      if (char === '\\') i++
      else if (char === quote) quote = ''
    } else if (char === '"' || char === "'") quote = char
    else if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ';' && !depth) {
      declarations.push(style.slice(start, i))
      start = i + 1
    }
  }
  declarations.push(style.slice(start))
  for (const declaration of declarations) {
    const colon = declaration.indexOf(':')
    if (colon < 0) continue
    const name = declaration.slice(0, colon).trim()
    const value = declaration.slice(colon + 1).trim()
    if (!name || !value) continue
    result[
      name.startsWith('--')
        ? name
        : name.toLowerCase().replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    ] = value
  }
  return result
}

/** A snapshot as an element tree for Satori, with its CSS in `<style>`. */
export function toSatori(snapshot: Snapshot) {
  const convert = (node: SnapshotNode): any => {
    if (typeof node === 'string') return node
    const [tag, attributes, children] = node
    const props: Record<string, any> = {}
    for (const [name, value] of Object.entries(attributes)) {
      if (name === 'class') props.className = value
      else if (name === 'style') props.style = parseInlineStyle(value)
      else props[name] = value
    }
    if (children.length) props.children = children.map(convert)
    return { type: tag, props }
  }
  const [, attributes, children] = snapshot.root
  return convert([
    'html',
    attributes,
    [['style', {}, [STATIC_CSS + '\n' + snapshot.css]], ...children],
  ])
}
