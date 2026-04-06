import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from '../../dist/index.js'

const outDir = resolve(process.cwd(), '.tmp/thai-render/out')
const kind = process.argv[2]
const fontPathArg = process.argv[3]
const fontName = process.argv[4] || 'Noto Sans Thai'
const label = process.argv[5] || 'noto-sans-thai'
const text = process.argv[6] || 'เยิ้ม'
const wordLabel = process.argv[7] || 'yeum'

if (!kind || (kind !== 'before' && kind !== 'after')) {
  throw new Error(
    'usage: node .tmp/thai-render/render-thai.mjs <before|after> <fontPath> [fontName] [label] [text] [wordLabel]'
  )
}

if (!fontPathArg) {
  throw new Error('fontPath is required')
}

const fontPath = resolve(process.cwd(), fontPathArg)
const fontData = await readFile(fontPath)

const width = 600
const height = 220

const svg = await satori(
  {
    type: 'div',
    props: {
      style: {
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        color: '#111111',
        fontFamily: fontName,
        fontSize: 144,
        lineHeight: 1,
      },
      children: text,
    },
  },
  {
    width,
    height,
    fonts: [
      {
        name: fontName,
        data: fontData,
        weight: 400,
        style: 'normal',
      },
    ],
  }
)

await mkdir(outDir, { recursive: true })

const svgPath = resolve(outDir, `thai-${wordLabel}-${label}-${kind}.svg`)
const pngPath = resolve(outDir, `thai-${wordLabel}-${label}-${kind}.png`)

await mkdir(dirname(svgPath), { recursive: true })
await writeFile(svgPath, svg)

const png = new Resvg(svg, {
  fitTo: { mode: 'original' },
  font: {
    loadSystemFonts: false,
    defaultFontFamily: fontName,
  },
}).render()

await writeFile(pngPath, png.asPng())

console.log(
  JSON.stringify({ kind, fontName, label, text, wordLabel, svgPath, pngPath }, null, 2)
)
