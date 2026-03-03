import { readFileSync } from 'fs'
import opentype from '@shuding/opentype.js'

const fontData = readFileSync('./test/assets/Roboto-Regular.ttf')
const arrayBuffer = fontData.buffer.slice(fontData.byteOffset, fontData.byteOffset + fontData.byteLength)

const font = opentype.parse(arrayBuffer, { lowMemory: true })

console.log('=== What opentype.js provides that HarfBuzz may not ===\n')

console.log('1. Font Metadata:')
console.log('   - unitsPerEm:', font.unitsPerEm)
console.log('   - ascender:', font.ascender)
console.log('   - descender:', font.descender)
console.log('   - names.fontFamily:', font.names?.fontFamily)
console.log('   - names.fontSubfamily:', font.names?.fontSubfamily)

console.log('\n2. Font Tables (OS/2):')
console.log('   - usWeightClass:', font.tables?.os2?.usWeightClass)
console.log('   - sTypoAscender:', font.tables?.os2?.sTypoAscender)
console.log('   - sTypoDescender:', font.tables?.os2?.sTypoDescender)
console.log('   - sTypoLineGap:', font.tables?.os2?.sTypoLineGap)

console.log('\n3. Character to Glyph:')
const testChars = ['A', 'fi', '你', '🎉']
for (const char of testChars) {
  const glyphIndex = font.charToGlyphIndex(char)
  console.log(`   - "${char}" -> glyph ${glyphIndex}`)
}

console.log('\n4. Glyph Object:')
const glyphA = font.glyphs.get(font.charToGlyphIndex('A'))
console.log('   - Glyph object keys:', Object.keys(glyphA).slice(0, 10))
console.log('   - Has path:', !!glyphA.path)
console.log('   - Has getPath method:', typeof glyphA.getPath === 'function')

console.log('\n5. What else:')
console.log('   - getAdvanceWidth:', typeof font.getAdvanceWidth === 'function')
console.log('   - stringToGlyphs:', typeof font.stringToGlyphs === 'function')
console.log('   - forEachGlyph:', typeof font.forEachGlyph === 'function')
