import type { NextRequest } from 'next/server'
import { FontDetector, languageFontMap } from '../../utils/font'

export const config = {
  runtime: 'experimental-edge',
}

const detector = new FontDetector()

// Our own encoding of multiple fonts and their code, so we can fetch them in one request. The structure is:
// [1 byte = X, length of language code][X bytes of language code string][4 bytes = Y, length of font][Y bytes of font data]
// Note that:
// - The language code can't be longer than 255 characters.
// - The language code can't contain non-ASCII characters.
// - The font data can't be longer than 4GB.
// When there are multiple fonts, they are concatenated together.
function encodeFontInfoAsArrayBuffer(code: string, fontData: ArrayBuffer) {
  // 1 byte per char
  const buffer = new ArrayBuffer(1 + code.length + 4 + fontData.byteLength)
  const bufferView = new Uint8Array(buffer)
  // 1 byte for the length of the language code
  bufferView[0] = code.length
  // X bytes for the language code
  for (let i = 0; i < code.length; i++) {
    bufferView[i + 1] = code.charCodeAt(i)
  }

  // 4 bytes for the length of the font data
  new DataView(buffer).setUint32(1 + code.length, fontData.byteLength, false)

  // Y bytes for the font data
  bufferView.set(new Uint8Array(fontData), 1 + code.length + 4)

  return buffer
}

export default async function loadGoogleFont(req: NextRequest) {
  if (req.nextUrl.pathname !== '/api/font') return

  const { searchParams } = new URL(req.url)

  const fonts = searchParams.getAll('fonts')
  const text = searchParams.get('text')

  if (!fonts || fonts.length === 0 || !text) return

  const textByFont = await detector.detect(text, fonts)

  const _fonts = Object.keys(textByFont)

  const encodedFontBuffers: ArrayBuffer[] = []
  let fontBufferByteLength = 0
  ;(
    await Promise.all(_fonts.map((font) => fetchFont(textByFont[font], font)))
  ).forEach((fontData, i) => {
    if (fontData) {
      // TODO: We should be able to directly get the language code here :)
      const langCode = Object.entries(languageFontMap).find(
        ([, v]) => v === _fonts[i]
      )?.[0]

      if (langCode) {
        const buffer = encodeFontInfoAsArrayBuffer(langCode, fontData)
        encodedFontBuffers.push(buffer)
        fontBufferByteLength += buffer.byteLength
      }
    }
  })

  const responseBuffer = new ArrayBuffer(fontBufferByteLength)
  const responseBufferView = new Uint8Array(responseBuffer)
  let offset = 0
  encodedFontBuffers.forEach((buffer) => {
    responseBufferView.set(new Uint8Array(buffer), offset)
    offset += buffer.byteLength
  })

  return new Response(responseBuffer, {
    headers: {
      'Content-Type': 'font/woff',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

async function fetchFont(
  text: string,
  font: string
): Promise<ArrayBuffer | null> {
  const API = `https://fonts.googleapis.com/css2?family=${font}&text=${encodeURIComponent(
    text
  )}`

  const css = await (
    await fetch(API, {
      headers: {
        // Make sure it returns TTF.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
      },
    })
  ).text()

  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)

  if (!resource) return null

  const res = await fetch(resource[1])

  return res.arrayBuffer()
}
