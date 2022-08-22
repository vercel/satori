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
        imageType = res.headers.get('content-type').toLowerCase()
        if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
          throw new Error(`Unsupported image type: ${imageType}`)
        }
        return res.arrayBuffer()
      })
      .then((data) => {
        const newSrc = `data:${imageType};base64,${arrayBufferToBase64(data)}`
        cache.set(src, newSrc)
        resolve(newSrc)
      })
      .catch(reject)
  })
  inflightRequests.set(src, promise)
  return promise
}
