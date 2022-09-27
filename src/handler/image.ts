/**
 * This module is used to fetch image from the given URL and resolve it as
 * base64 inlined data URI, so the toolchain can process it.
 * The image data will be cached in a LRU so we don't need to fetch it again
 * in new render processes. But to invalidate the cache the workaround is to
 * add a random query string to the URL.
 * TODO: We might want another option to disable image caching by default.
 */

function parseJPEG(buf: ArrayBuffer) {
  const view = new DataView(buf)

  // Skip magic bytes
  let offset = 4

  const len = view.byteLength
  while (offset < len) {
    const i = view.getUint16(offset, false)

    if (i > len) {
      throw new TypeError('Invalid JPEG')
    }

    const next = view.getUint8(i + 1 + offset)
    if (next === 0xc0 || next === 0xc1 || next === 0xc2) {
      return [
        view.getUint16(i + 7 + offset, false),
        view.getUint16(i + 5 + offset, false),
      ] as [number, number]
    }

    // TODO: Support orientations from EXIF.

    offset += i + 2
  }

  throw new TypeError('Invalid JPEG')
}

function parseGIF(buf: ArrayBuffer) {
  const view = new Uint8Array(buf.slice(6, 10))
  return [view[0] | (view[1] << 8), view[2] | (view[3] << 8)] as [
    number,
    number
  ]
}

function parsePNG(buf: ArrayBuffer) {
  const v = new DataView(buf)
  return [v.getUint16(18, false), v.getUint16(22, false)] as [number, number]
}

import { createLRU } from '../utils'

type ResolvedImageData = [string, number?, number?]
const cache = createLRU<ResolvedImageData>(100)
const inflightRequests = new Map<string, Promise<ResolvedImageData>>()

const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/svg+xml',
]

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export async function resolveImageData(
  src: string
): Promise<ResolvedImageData> {
  if (!src) {
    throw new Error('Image source is not provided.')
  }

  if (src.startsWith('data:')) {
    return [src]
  }

  if (!globalThis.fetch) {
    throw new Error('`fetch` is required to be polyfilled to load images.')
  }

  if (inflightRequests.has(src)) {
    return inflightRequests.get(src)
  }
  const cached = cache.get(src)
  if (cached) {
    return cached
  }

  const promise = new Promise<ResolvedImageData>((resolve, reject) => {
    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((data) => {
        let imageType: string
        let imageSize: [number, number]

        const magicBytes = new Uint8Array(data.slice(0, 4))
        const magicString = [...magicBytes]
          .map((byte) => byte.toString(16))
          .join('')
        switch (magicString) {
          case '89504e47':
            imageType = 'image/png'
            imageSize = parsePNG(data)
            break
          case '47494638':
            imageType = 'image/gif'
            imageSize = parseGIF(data)
            break
          case 'ffd8ffe0':
          case 'ffd8ffe1':
          case 'ffd8ffe2':
          case 'ffd8ffe3':
          case 'ffd8ffe8':
            imageType = 'image/jpeg'
            imageSize = parseJPEG(data)
            break
        }
        if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
          throw new Error(`Unsupported image type: ${imageType || 'unknown'}`)
        }
        const newSrc = `data:${imageType};base64,${arrayBufferToBase64(data)}`
        cache.set(src, [newSrc, ...imageSize])
        resolve([newSrc, ...imageSize])
      })
      .catch(reject)
  })
  inflightRequests.set(src, promise)
  return promise
}
