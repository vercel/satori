import { readFileSync } from 'fs'

const hb = await import('harfbuzzjs').then(m => m.default)

// Load font
const fontData = readFileSync('./test/assets/Roboto-Regular.ttf')
const blob = hb.createBlob(new Uint8Array(fontData))
const face = hb.createFace(blob, 0)
const font = hb.createFont(face)
font.setScale(2048, 2048) // Set scale to unitsPerEm

console.log('=== Font Metrics (after setScale) ===')
const hExtents = font.hExtents()
const vExtents = font.vExtents()
console.log('Horizontal extents:', hExtents)
console.log('Vertical extents:', vExtents)

console.log('\n=== Test character to glyph mapping ===')
// Shape text to get glyph IDs
const buffer = hb.createBuffer()
buffer.addText('ABCabc')
buffer.guessSegmentProperties()
hb.shape(font, buffer)
const shaped = buffer.json(font)
console.log('Shaped "ABCabc":', shaped)

console.log('\n=== Extract glyph path for letter "A" ===')
const glyphA = shaped.find(g => g.cl === 0)
if (glyphA) {
  console.log('Glyph ID for "A":', glyphA.g)
  const path = font.glyphToPath(glyphA.g)
  console.log('Path length:', path.length)
  console.log('Path preview:', path.substring(0, 150))
  
  const glyphJson = font.glyphToJson(glyphA.g)
  console.log('Glyph metrics:', glyphJson)
}

console.log('\n=== Can we get unitsPerEm from face? ===')
// Try to get font table data
console.log('Face has reference_table:', typeof face.reference_table === 'function')

console.log('\n=== Collect unicodes ===')
const unicodes = face.collectUnicodes()
console.log('Unicode count:', unicodes?.length || 0)
console.log('First 10 unicodes:', unicodes?.slice(0, 10))

buffer.destroy()
font.destroy()
face.destroy()
blob.destroy()
