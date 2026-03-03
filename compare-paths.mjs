import { readFileSync } from 'fs'
import opentype from '@shuding/opentype.js'

const hb = await import('harfbuzzjs').then(m => m.default)

// Load font with both systems
const fontData = readFileSync('./test/assets/Roboto-Regular.ttf')
const arrayBuffer = fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength)

const otFont = opentype.parse(arrayBuffer, { lowMemory: true })

const blob = hb.createBlob(new Uint8Array(arrayBuffer))
const face = hb.createFace(blob, 0)
const hbFont = hb.createFont(face)
hbFont.setScale(otFont.unitsPerEm, otFont.unitsPerEm)

// Shape with HarfBuzz
const buffer = hb.createBuffer()
buffer.addText('t')
buffer.guessSegmentProperties()
hb.shape(hbFont, buffer)
const shaped = buffer.json(hbFont)

const hbPath = hbFont.glyphToPath(shaped[0].g)
const otGlyph = otFont.glyphs.get(shaped[0].g)
const otPath = otGlyph.getPath(0, 0, 100, {}).toPathData(1)

console.log('HarfBuzz path:')
console.log(hbPath)
console.log('\nOpenType.js path:')
console.log(otPath)

console.log('\n=== Parse OS/2 table for weight ===')
const os2Table = face.reference_table('OS/2')
if (os2Table && os2Table.length >= 6) {
  const view = new DataView(os2Table.buffer, os2Table.byteOffset, os2Table.byteLength)
  const usWeightClass = view.getUint16(4)
  console.log('Weight from OS/2:', usWeightClass)
}

buffer.destroy()
hbFont.destroy()
face.destroy()
blob.destroy()
