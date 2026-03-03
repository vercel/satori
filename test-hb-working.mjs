import { readFileSync } from 'fs'

const hb = await import('harfbuzzjs').then(m => m.default)

// Load font - exact same way as before
const fontData = readFileSync('./test/assets/Roboto-Regular.ttf')
const blob = hb.createBlob(new Uint8Array(fontData))
const face = hb.createFace(blob, 0)
const font = hb.createFont(face)
font.setScale(1000, 1000)

console.log('=== Shape "test" ===')
const buffer = hb.createBuffer()
buffer.addText('test')
buffer.guessSegmentProperties()
hb.shape(font, buffer)
const shaped = buffer.json(font)
console.log('Shaped:', shaped)

console.log('\n=== Get path for glyph', shaped[0].g, '===')
const path = font.glyphToPath(shaped[0].g)
console.log('Path:', path)

console.log('\n=== Get JSON for glyph', shaped[0].g, '===')
const glyphJson = font.glyphToJson(shaped[0].g)
console.log('Glyph JSON:', glyphJson)

buffer.destroy()
font.destroy()
face.destroy()
blob.destroy()
