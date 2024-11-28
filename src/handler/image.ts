/**
 * This module is used to fetch image from the given URL and resolve it as
 * base64 inlined data URI, so the toolchain can process it.
 * The image data will be cached in a LRU so we don't need to fetch it again
 * in new render processes. But to invalidate the cache the workaround is to
 * add a random query string to the URL.
 * TODO: We might want another option to disable image caching by default.
 */

const AVIF = 'image/avif'
const WEBP = 'image/webp'
const APNG = 'image/apng'
const PNG = 'image/png'
const JPEG = 'image/jpeg'
const GIF = 'image/gif'
const SVG = 'image/svg+xml'

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

import { createLRU, parseViewBox } from '../utils.js'

type ResolvedImageData = [string, number?, number?] | readonly []
export const cache = createLRU<ResolvedImageData>(100)
export const inflightRequests = new Map<string, Promise<ResolvedImageData>>()

const ALLOWED_IMAGE_TYPES = [PNG, APNG, JPEG, GIF, SVG]

function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  let binaryString = atob(base64)
  let len = binaryString.length
  let bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

function parseSvgImageSize(src: string, data: string) {
  // Parse the SVG image size
  const svgTag = data.match(/<svg[^>]*>/)[0]

  const viewBoxStr = svgTag.match(/viewBox=['"](.+)['"]/)
  let viewBox = viewBoxStr ? parseViewBox(viewBoxStr[1]) : null

  const width = svgTag.match(/width=['"](\d*\.\d+|\d+)['"]/)
  const height = svgTag.match(/height=['"](\d*\.\d+|\d+)['"]/)

  if (!viewBox && (!width || !height)) {
    throw new Error(`Failed to parse SVG from ${src}: missing "viewBox"`)
  }

  const size = viewBox ? [viewBox[2], viewBox[3]] : [+width[1], +height[1]]

  const ratio = size[0] / size[1]
  const imageSize: [number, number] =
    width && height
      ? [+width[1], +height[1]]
      : width
      ? [+width[1], +width[1] / ratio]
      : height
      ? [+height[1] * ratio, +height[1]]
      : [size[0], size[1]]

  return imageSize
}

function arrayBufferToDataUri(data: ArrayBuffer) {
  let imageSize: [number, number]

  const imageType = detectContentType(new Uint8Array(data))

  switch (imageType) {
    case PNG:
    case APNG:
      imageSize = parsePNG(data)
      break
    case GIF:
      imageSize = parseGIF(data)
      break
    case JPEG:
      imageSize = parseJPEG(data)
      break
  }

  if (!ALLOWED_IMAGE_TYPES.includes(imageType)) {
    throw new Error(`Unsupported image type: ${imageType || 'unknown'}`)
  }
  return [
    `data:${imageType};base64,${arrayBufferToBase64(data)}`,
    imageSize,
  ] as const
}

export async function resolveImageData(
  src: string | ArrayBuffer
): Promise<ResolvedImageData> {
  if (!src) {
    throw new Error('Image source is not provided.')
  }

  // ArrayBuffer
  if (typeof src === 'object') {
    const [newSrc, imageSize] = arrayBufferToDataUri(src)
    return [newSrc, ...imageSize] as ResolvedImageData
  }

  if (
    (src.startsWith('"') && src.endsWith('"')) ||
    (src.startsWith("'") && src.endsWith("'"))
  ) {
    src = src.slice(1, -1)
  }

  // Throw error if the image source is not an absolute URL in server environment
  // Should be after slicing quotes to avoid throwing error too early
  if (typeof window === 'undefined') {
    if (!src.startsWith('http') && !src.startsWith('data:')) {
      throw new Error(`Image source must be an absolute URL: ${src}`)
    }
  }

  if (src.startsWith('data:')) {
    let decodedURI: { imageType; encodingType; dataString }

    try {
      decodedURI =
        /data:(?<imageType>[a-z/+]+)(;[^;=]+=[^;=]+)*?(;(?<encodingType>[^;,]+))?,(?<dataString>.*)/g.exec(
          src
        ).groups as typeof decodedURI
    } catch (err) {
      console.warn('Image data URI resolved without size:' + src)
      return [src]
    }

    const { imageType, encodingType, dataString } = decodedURI
    if (imageType === SVG) {
      const utf8Src =
        encodingType === 'base64'
          ? atob(dataString)
          : decodeURIComponent(dataString.replace(/ /g, '%20'))
      const base64Src =
        encodingType === 'base64'
          ? src
          : `data:image/svg+xml;base64,${btoa(utf8Src)}`
      let imageSize = parseSvgImageSize(src, utf8Src)
      cache.set(src, [base64Src, ...imageSize])
      return [base64Src, ...imageSize]
    } else if (encodingType === 'base64') {
      let imageSize: [number, number]
      const data = base64ToArrayBuffer(dataString)
      switch (imageType) {
        case PNG:
        case APNG:
          imageSize = parsePNG(data)
          break
        case GIF:
          imageSize = parseGIF(data)
          break
        case JPEG:
          imageSize = parseJPEG(data)
          break
      }
      cache.set(src, [src, ...imageSize])
      return [src, ...imageSize]
    } else {
      console.warn('Image data URI resolved without size:' + src)
      cache.set(src, [src])
      return [src]
    }
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

  const url = src
  const promise = fetch(url)
    .then((res): Promise<string | ArrayBuffer> => {
      const type = res.headers.get('content-type')

      // Handle SVG specially
      if (type === 'image/svg+xml' || type === 'application/svg+xml') {
        return res.text()
      }

      return res.arrayBuffer()
    })
    .then((data) => {
      if (typeof data === 'string') {
        try {
          const newSrc = `data:image/svg+xml;base64,${btoa(data)}`
          // Parse the SVG image size
          const imageSize = parseSvgImageSize(url, data)
          return [newSrc, ...imageSize] as ResolvedImageData
        } catch (e) {
          throw new Error(`Failed to parse SVG image: ${e.message}`)
        }
      }

      const [newSrc, imageSize] = arrayBufferToDataUri(data)
      return [newSrc, ...imageSize] as ResolvedImageData
    })
    .then((result) => {
      cache.set(url, result)
      return result
    })
    .catch((err) => {
      console.error(`Can't load image ${url}: ` + err.message)
      cache.set(url, [])
      return [] as const
    })

  inflightRequests.set(url, promise)
  return promise
}

/**
 * Inspects the first few bytes of a buffer to determine if
 * it matches the "magic number" of known file signatures.
 * https://en.wikipedia.org/wiki/List_of_file_signatures
 */
function detectContentType(buffer: Uint8Array) {
  if ([0xff, 0xd8, 0xff].every((b, i) => buffer[i] === b)) {
    return JPEG
  }
  if (
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (b, i) => buffer[i] === b
    )
  ) {
    if (detectAPNG(buffer)) {
      return APNG
    }
    return PNG
  }
  if ([0x47, 0x49, 0x46, 0x38].every((b, i) => buffer[i] === b)) {
    return GIF
  }
  if (
    [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50].every(
      (b, i) => !b || buffer[i] === b
    )
  ) {
    return WEBP
  }
  if ([0x3c, 0x3f, 0x78, 0x6d, 0x6c].every((b, i) => buffer[i] === b)) {
    return SVG
  }
  if (
    [0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66].every(
      (b, i) => !b || buffer[i] === b
    )
  ) {
    return AVIF
  }
  return null
}

function detectAPNG(bytes: Uint8Array) {
  const dv = new DataView(bytes.buffer)
  let type: string,
    length: number,
    off = 8,
    isAPNG = false
  while (!isAPNG && type !== 'IEND' && off < bytes.length) {
    length = dv.getUint32(off)
    const chars = bytes.subarray(off + 4, off + 8)
    type = String.fromCharCode(...chars)
    isAPNG = type === 'acTL'
    off += 12 + length
  }
  return isAPNG
}
