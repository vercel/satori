import { readFileSync } from 'fs'

const hb = await import('harfbuzzjs').then(m => m.default)

// Load font
const fontData = readFileSync('./test/assets/Roboto-Regular.ttf')
const blob = hb.createBlob(new Uint8Array(fontData))
const face = hb.createFace(blob, 0)
const font = hb.createFont(face)

console.log('=== Font Table Access ===')

// Common font tables we need
const tables = ['head', 'hhea', 'OS/2', 'name', 'cmap', 'post']

for (const tableName of tables) {
  const tableTag = hb.otTagToScript ? tableName : tableName
  const table = face.reference_table(tableName)
  console.log(`\n${tableName} table:`, table)
  
  if (table && table.length) {
    console.log(`  - Size: ${table.length} bytes`)
    
    // For 'head' table, we could parse unitsPerEm
    if (tableName === 'head' && table.length >= 18) {
      // unitsPerEm is at offset 18-19 (2 bytes, big-endian)
      const unitsPerEm = (table[18] << 8) | table[19]
      console.log(`  - unitsPerEm: ${unitsPerEm}`)
    }
    
    // For 'hhea' table, we could parse ascender/descender
    if (tableName === 'hhea' && table.length >= 8) {
      const view = new DataView(table.buffer, table.byteOffset, table.byteLength)
      const ascender = view.getInt16(4)
      const descender = view.getInt16(6)
      const lineGap = view.getInt16(8)
      console.log(`  - ascender: ${ascender}`)
      console.log(`  - descender: ${descender}`)
      console.log(`  - lineGap: ${lineGap}`)
    }
  }
}

console.log('\n=== Collect Unicodes ===')
const unicodes = face.collectUnicodes()
console.log('Unicode array:', unicodes.constructor.name)
console.log('First 20 unicodes:', Array.from(unicodes.slice(0, 20)))

font.destroy()
face.destroy()
blob.destroy()
