/**
 * Minimal PNG encoder for raw pixels produced inside Satori (e.g. `<canvas>`).
 */

import { zlibSync } from 'fflate'

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]

let crcTable: Int32Array | undefined

function crc32(bytes: Uint8Array, start: number, end: number): number {
  if (!crcTable) {
    crcTable = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c
    }
  }

  let c = -1
  for (let i = start; i < end; i++) {
    c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ -1) >>> 0
}

function writeChunk(
  png: Uint8Array,
  view: DataView,
  offset: number,
  type: string,
  data: Uint8Array
): number {
  view.setUint32(offset, data.length)
  for (let i = 0; i < 4; i++) png[offset + 4 + i] = type.charCodeAt(i)
  png.set(data, offset + 8)
  const end = offset + 8 + data.length
  view.setUint32(end, crc32(png, offset + 4, end))
  return end + 4
}

/**
 * Encode top-down, straight-alpha RGBA pixels as an 8-bit RGBA PNG.
 *
 * Rows use the "Sub" filter with fast deflate: on typical shader output this is
 * ~25% smaller than unfiltered rows at about the same encoding cost.
 */
export function encodePNG(
  pixels: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const stride = width * 4
  const filtered = new Uint8Array((stride + 1) * height)

  for (let y = 0; y < height; y++) {
    const from = y * stride
    const to = y * (stride + 1) + 1
    filtered[to - 1] = 1 // Filter type: Sub.
    for (let x = 0; x < 4; x++) filtered[to + x] = pixels[from + x]
    for (let x = 4; x < stride; x++) {
      // Uint8Array assignment wraps modulo 256, as the filter requires.
      filtered[to + x] = pixels[from + x] - pixels[from + x - 4]
    }
  }

  const header = new Uint8Array(13)
  const headerView = new DataView(header.buffer)
  headerView.setUint32(0, width)
  headerView.setUint32(4, height)
  header[8] = 8 // Bit depth.
  header[9] = 6 // Color type: RGBA.

  const data = zlibSync(filtered, { level: 1 })

  const png = new Uint8Array(
    PNG_SIGNATURE.length + 12 + header.length + 12 + data.length + 12
  )
  const view = new DataView(png.buffer)
  png.set(PNG_SIGNATURE)

  let offset = PNG_SIGNATURE.length
  offset = writeChunk(png, view, offset, 'IHDR', header)
  offset = writeChunk(png, view, offset, 'IDAT', data)
  writeChunk(png, view, offset, 'IEND', new Uint8Array(0))

  return png
}
