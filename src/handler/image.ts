/**
 * This module is used to fetch image from the given URL and resolve it as
 * base64 inlined data URI, so the toolchain can process it.
 * The image data will be cached in a LRU so we don't need to fetch it again
 * in new render processes. But to invalidate the cache the workaround is to
 * add a random query string to the URL.
 * TODO: We might want another option to disable image caching by default.
 */

import { createLRU } from '../utils'

const cache = createLRU<string>(100)
const inflightRequests = new Map<string, Promise<string>>()

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

export async function resolveImageData(src: string) {
  if (!src) {
    throw new Error('Image URL is not provided')
  }

  if (src.startsWith('data:')) {
    return src
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

  const promise = new Promise<string>((resolve, reject) => {
    let imageType: string
    fetch(src)
      .then((res) => {
        imageType = (res.headers.get('content-type') || '').toLowerCase()
        return res.arrayBuffer()
      })
      .then((data) => {
        // `content-type` might be missing, we detect the type based on magic bytes.
        if (!imageType) {
          const magicBytes = new Uint8Array(data.slice(0, 4))
          const magicString = [...magicBytes]
            .map((byte) => byte.toString(16))
            .join('')
          switch (magicString) {
            case '89504e47':
              imageType = 'image/png'
              break
            case '47494638':
              imageType = 'image/gif'
              break
            case 'ffd8ffe0':
            case 'ffd8ffe1':
            case 'ffd8ffe2':
            case 'ffd8ffe3':
            case 'ffd8ffe8':
              imageType = 'image/jpeg'
              break
          }
        }
        if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
          throw new Error(`Unsupported image type: ${imageType || 'unknown'}`)
        }
        const newSrc = `data:${imageType};base64,${arrayBufferToBase64(data)}`
        cache.set(src, newSrc)
        resolve(newSrc)
      })
      .catch(reject)
  })
  inflightRequests.set(src, promise)
  return promise
}
