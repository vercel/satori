/**
 * Compares Satori with Chrome on snapshots of real website sections, see
 * `cases.ts` and `capture.ts`:
 *
 *   pnpm fidelity [names...]            compare with the saved scores
 *   pnpm fidelity --update [names...]   also save the scores
 *
 * Uses `dist`, so run `pnpm build` first. The SVG and images of Satori, the
 * differences and all of them side by side are written to `output`, and so
 * are the saved scores. They aren't committed, so that changes don't conflict
 * with each other.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import pixelmatch from 'pixelmatch'
import sharp from 'sharp'

import satori from '../../dist/index.js'
import { cases } from './cases.ts'
import { casesDir, loadFonts, readSnapshot, toSatori } from './snapshot.ts'

interface Score {
  /** The share of pixels that differ from Chrome, in percent. */
  mismatch: number
  /**
   * The share of content pixels that differ, in percent: pixels that aren't
   * the background of the page in Chrome or Satori. Unlike `mismatch`, it
   * doesn't depend on how much of the section is empty.
   */
  contentMismatch: number
  /** The declarations that Satori reported with `onStyleError`. */
  styleErrors: number
  /** Why Satori failed to render, which counts as a mismatch of 100%. */
  error?: string
}

type Fonts = ReturnType<typeof loadFonts>

const outputDir = join(import.meta.dirname, 'output')
const scoresFile = join(outputDir, 'scores.json')

/** The height of the labels above the side-by-side images. */
const LABEL_HEIGHT = 36

/** The most common color of an image, as its background. */
function getBackground(data: Buffer) {
  const counts = new Map<number, number>()
  let background = 0
  let max = 0
  for (let i = 0; i < data.length; i += 4) {
    const color = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2]
    const count = (counts.get(color) ?? 0) + 1
    counts.set(color, count)
    if (count > max) {
      max = count
      background = color
    }
  }
  return [background >> 16, (background >> 8) & 255, background & 255]
}

/** The pixels that differ from the background in either image. */
function countContent(a: Buffer, b: Buffer, background: number[]) {
  const differs = (data: Buffer, i: number) =>
    Math.abs(data[i] - background[0]) > 8 ||
    Math.abs(data[i + 1] - background[1]) > 8 ||
    Math.abs(data[i + 2] - background[2]) > 8
  let count = 0
  for (let i = 0; i < a.length; i += 4) {
    if (differs(a, i) || differs(b, i)) count++
  }
  return count
}

async function toRGBA(png: Buffer) {
  const { data } = await sharp(png)
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  return data
}

const toPNG = (svg: string) =>
  new Resvg(svg, {
    fitTo: { mode: 'original' },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng()

/** Renders a simple element with Satori, for labels and errors. */
async function renderPanel(
  children: string,
  width: number,
  height: number,
  fonts: Fonts,
  style: Record<string, string | number>
) {
  const element = {
    type: 'div',
    props: {
      style: { display: 'flex', width, height, ...style },
      children,
    },
  }
  return toPNG(await satori(element as any, { width, height, fonts }))
}

/** Chrome, Satori and the differences side by side, with labels. */
async function compose(
  [chromePNG, satoriPNG, diffPNG]: Buffer[],
  width: number,
  height: number,
  fonts: Fonts,
  score: Score
) {
  const labels = [
    'Chrome',
    score.error ? 'Satori (failed)' : 'Satori',
    `Difference: ${score.mismatch}% of pixels, ${score.contentMismatch}% of content`,
  ]
  const labelPNGs = await Promise.all(
    labels.map((label) =>
      renderPanel(label, width, LABEL_HEIGHT, fonts, {
        alignItems: 'center',
        paddingLeft: 12,
        fontSize: 16,
        fontWeight: 500,
        color: '#333',
        background: '#ebebeb',
      })
    )
  )
  return sharp({
    create: {
      width: width * 3,
      height: LABEL_HEIGHT + height,
      channels: 4,
      background: '#ffffff',
    },
  })
    .composite(
      [chromePNG, satoriPNG, diffPNG].flatMap((input, i) => [
        { input: labelPNGs[i], left: width * i, top: 0 },
        { input, left: width * i, top: LABEL_HEIGHT },
      ])
    )
    .png({ compressionLevel: 9 })
    .toBuffer()
}

async function run(name: string) {
  const testCase = cases.find((c) => c.name === name)!
  const snapshot = readSnapshot(name)
  const { width, height } = snapshot
  const fonts = loadFonts(testCase.fonts)
  const chromePNG = readFileSync(join(casesDir, name, 'chrome.png'))
  const styleErrors: string[] = []

  const element = toSatori(snapshot) as any
  let satoriSVG: string | undefined
  let satoriPNG: Buffer | undefined
  let error: string | undefined
  // The median time of renders after the first one, without rasterizing.
  let time: number | undefined
  try {
    satoriSVG = await satori(element, {
      width,
      height,
      fonts,
      onStyleError: (styleError) => styleErrors.push(styleError.message),
    })
    satoriPNG = toPNG(satoriSVG)
    const times: number[] = []
    for (let i = 0; i < 3; i++) {
      const start = performance.now()
      await satori(element, {
        width,
        height,
        fonts,
        onStyleError: () => undefined,
      })
      times.push(performance.now() - start)
    }
    time = times.sort((a, b) => a - b)[1]
  } catch (renderError) {
    error = (renderError as Error).message
  }

  let diffPNG: Buffer
  let score: Score
  if (!satoriPNG) {
    // A failed render shows the error, and differs everywhere.
    score = {
      mismatch: 100,
      contentMismatch: 100,
      styleErrors: styleErrors.length,
      error,
    }
    satoriPNG = await renderPanel(
      `Satori failed: ${error}`,
      width,
      height,
      fonts,
      {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
        fontSize: 20,
        color: '#c00',
        background: '#ffffff',
        textAlign: 'center',
      }
    )
    diffPNG = await sharp({
      create: { width, height, channels: 4, background: '#ff0000' },
    })
      .png()
      .toBuffer()
  } else {
    const [actual, expected] = await Promise.all([
      toRGBA(satoriPNG),
      toRGBA(chromePNG),
    ])
    const diff = Buffer.alloc(width * height * 4)
    const different = pixelmatch(expected, actual, diff, width, height, {
      threshold: 0.1,
      includeAA: false,
    })
    diffPNG = await sharp(diff, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer()
    const percent = (count: number, total: number) =>
      total ? Math.round((count / total) * 10000) / 100 : 0
    const content = countContent(expected, actual, getBackground(expected))
    score = {
      mismatch: percent(different, width * height),
      contentMismatch: percent(different, content),
      styleErrors: styleErrors.length,
    }
  }

  const compare = await compose(
    [chromePNG, satoriPNG, diffPNG],
    width,
    height,
    fonts,
    score
  )
  const dir = join(outputDir, name)
  mkdirSync(dir, { recursive: true })
  // The SVG of the last render that succeeded would be misleading.
  if (satoriSVG) writeFileSync(join(dir, 'satori.svg'), satoriSVG)
  else rmSync(join(dir, 'satori.svg'), { force: true })
  writeFileSync(join(dir, 'satori.png'), satoriPNG)
  writeFileSync(join(dir, 'diff.png'), diffPNG)
  writeFileSync(join(dir, 'compare.png'), compare)
  writeFileSync(join(dir, 'styleErrors.txt'), styleErrors.join('\n') + '\n')
  return { score, time, size: `${width}x${height}` }
}

const args = process.argv.slice(2)
const update = args.includes('--update')
const names = args.filter((arg) => !arg.startsWith('--'))
const selected = names.length
  ? cases.filter((testCase) => names.includes(testCase.name))
  : cases

const baseline: Record<string, Score> = existsSync(scoresFile)
  ? JSON.parse(readFileSync(scoresFile, 'utf8'))
  : {}
const scores = { ...baseline }
const rows: Record<string, string | number>[] = []

for (const testCase of selected) {
  if (!existsSync(join(casesDir, testCase.name, 'snapshot.json'))) {
    rows.push({ case: testCase.name, mismatch: 'not captured' })
    continue
  }
  const { score, time, size } = await run(testCase.name)
  const before = baseline[testCase.name]
  const change = (key: 'mismatch' | 'contentMismatch') => {
    if (!before) return `${score[key]} (new)`
    const delta = score[key] - before[key]
    return `${score[key]} (${delta > 0 ? '+' : ''}${delta.toFixed(2)})`
  }
  rows.push({
    case: testCase.name,
    size,
    'mismatch %': change('mismatch'),
    'content mismatch %': change('contentMismatch'),
    'style errors': score.styleErrors,
    'satori ms': time === undefined ? '-' : Math.round(time),
  })
  if (score.error) console.error(`${testCase.name}: ${score.error}`)
  scores[testCase.name] = score
}

console.table(rows)
console.log(`Images in ${outputDir}`)
if (update) {
  mkdirSync(outputDir, { recursive: true })
  writeFileSync(scoresFile, JSON.stringify(scores, null, 2) + '\n')
  console.log(`Saved the scores in ${scoresFile}`)
}
