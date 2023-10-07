import hb from './hb.wasm'
import { __loadHarfbuzz } from './harfbuzz'

export * from './harfbuzz'

export function initHB() {
  __loadHarfbuzz(decode(hb))
}

function asciiToBinary(str) {
  if (typeof atob === 'function') {
    // this works in the browser
    return atob(str)
  } else {
    // this works in node
    return new Buffer(str, 'base64').toString('binary')
  }
}

function decode(encoded: string): ArrayBuffer {
  const binaryString = asciiToBinary(encoded)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
