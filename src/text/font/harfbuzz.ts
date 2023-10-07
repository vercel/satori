type Pointer = number

const HB_MEMORY_MODE_WRITABLE = 2
const HB_SET_VALUE_INVALID: Pointer = -1

class HarfBuzzExports {
  readonly heapu8: Uint8Array
  readonly heapu32: Uint32Array
  readonly heapi32: Int32Array
  readonly utf8Encoder: TextEncoder

  //exported HarfBuzz methods
  readonly malloc: (length: number) => Pointer
  readonly free: (ptr: Pointer) => void
  readonly free_ptr: () => Pointer
  readonly hb_blob_create: (
    data: Pointer,
    length: number,
    memoryMode: number,
    useData: Pointer,
    destroyFunction: Pointer
  ) => Pointer
  readonly hb_blob_destroy: (ptr: Pointer) => void
  readonly hb_face_create: (blobPtr: Pointer, index: number) => Pointer
  readonly hb_face_get_upem: (facePtr: Pointer) => number
  readonly hb_face_destroy: (ptr: Pointer) => void
  readonly hb_font_create: (facePtr: Pointer) => Pointer
  readonly hb_font_set_scale: (
    fontPtr: Pointer,
    xScale: number,
    yScale: number
  ) => void
  readonly hb_font_destroy: (ptr: Pointer) => void
  readonly hb_face_collect_unicodes: (facePtr: Pointer, setPtr: Pointer) => void
  readonly hb_set_create: () => Pointer
  readonly hb_set_destroy: (setPtr: Pointer) => void
  readonly hb_set_get_population: (setPtr: Pointer) => number
  readonly hb_set_next_many: (
    setPtr: Pointer,
    greaterThanUnicodePtr: Pointer,
    outputU32ArrayPtr: Pointer,
    size: number
  ) => number
  readonly hb_buffer_create: () => Pointer
  readonly hb_buffer_add_utf8: (
    bufferPtr: Pointer,
    stringPtr: Pointer,
    stringLength: number,
    itemOffset: number,
    itemLength: number
  ) => void
  readonly hb_buffer_guess_segment_properties: (bufferPtr: Pointer) => void
  readonly hb_buffer_set_direction: (
    bufferPtr: Pointer,
    direction: number
  ) => void
  readonly hb_shape: (
    fontPtr: Pointer,
    bufferPtr: Pointer,
    features: any,
    numFeatures: number
  ) => void
  readonly hb_buffer_get_length: (bufferPtr: Pointer) => number
  readonly hb_buffer_get_glyph_infos: (
    bufferPtr: Pointer,
    length: number
  ) => any
  readonly hb_buffer_get_glyph_positions: (
    bufferPtr: Pointer,
    length: number
  ) => any
  readonly hb_buffer_destroy: (bufferPtr: Pointer) => void

  constructor(exports: any) {
    this.heapu8 = new Uint8Array(exports.memory.buffer)
    this.heapu32 = new Uint32Array(exports.memory.buffer)
    this.heapi32 = new Int32Array(exports.memory.buffer)
    this.utf8Encoder = new TextEncoder()

    this.malloc = exports.malloc
    this.free = exports.free
    this.free_ptr = exports.free_ptr
    this.hb_blob_destroy = exports.hb_blob_destroy
    this.hb_blob_create = exports.hb_blob_create
    this.hb_face_create = exports.hb_face_create
    this.hb_face_get_upem = exports.hb_face_get_upem
    this.hb_face_destroy = exports.hb_face_destroy
    this.hb_face_collect_unicodes = exports.hb_face_collect_unicodes
    this.hb_set_create = exports.hb_set_create
    this.hb_set_destroy = exports.hb_set_destroy
    this.hb_set_get_population = exports.hb_set_get_population
    this.hb_set_next_many = exports.hb_set_next_many
    this.hb_font_create = exports.hb_font_create
    this.hb_font_set_scale = exports.hb_font_set_scale
    this.hb_font_destroy = exports.hb_font_destroy
    this.hb_buffer_create = exports.hb_buffer_create
    this.hb_buffer_add_utf8 = exports.hb_buffer_add_utf8
    this.hb_buffer_guess_segment_properties =
      exports.hb_buffer_guess_segment_properties
    this.hb_buffer_set_direction = exports.hb_buffer_set_direction
    this.hb_shape = exports.hb_shape
    this.hb_buffer_get_length = exports.hb_buffer_get_length
    this.hb_buffer_get_glyph_infos = exports.hb_buffer_get_glyph_infos
    this.hb_buffer_get_glyph_positions = exports.hb_buffer_get_glyph_positions
    this.hb_buffer_destroy = exports.hb_buffer_destroy
  }
}

let hb: HarfBuzzExports

class CString {
  readonly ptr: Pointer
  readonly length: number

  constructor(text: string) {
    let bytes = hb.utf8Encoder.encode(text)
    this.ptr = hb.malloc(bytes.byteLength)
    hb.heapu8.set(bytes, this.ptr)
    this.length = bytes.byteLength
  }

  destroy() {
    hb.free(this.ptr)
  }
}

export class HarfBuzzBlob {
  readonly ptr: Pointer

  constructor(data: Uint8Array) {
    let blobPtr = hb.malloc(data.length)
    hb.heapu8.set(data, blobPtr)
    this.ptr = hb.hb_blob_create(
      blobPtr,
      data.byteLength,
      HB_MEMORY_MODE_WRITABLE,
      blobPtr,
      hb.free_ptr()
    )
  }

  destroy() {
    hb.hb_blob_destroy(this.ptr)
  }
}

function typedArrayFromSet<T extends 'u8' | 'u32' | 'i32'>(
  setPtr: Pointer,
  arrayType: T
) {
  const heap = hb[`heap${arrayType}`]
  const bytesPerElment = heap.BYTES_PER_ELEMENT
  const setCount = hb.hb_set_get_population(setPtr)
  const arrayPtr = hb.malloc(setCount * bytesPerElment)
  const arrayOffset = arrayPtr / bytesPerElment
  const array = heap.subarray(
    arrayOffset,
    arrayOffset + setCount
  ) as typeof hb[`heap${T}`]
  heap.set(array, arrayOffset)
  hb.hb_set_next_many(setPtr, HB_SET_VALUE_INVALID, arrayPtr, setCount)
  return array
}

export class HarfBuzzFace {
  readonly ptr: Pointer

  constructor(blob: HarfBuzzBlob, index: number) {
    this.ptr = hb.hb_face_create(blob.ptr, index)
  }

  getUnitsPerEM() {
    return hb.hb_face_get_upem(this.ptr)
  }

  collectUnicodes() {
    const unicodeSetPtr = hb.hb_set_create()
    hb.hb_face_collect_unicodes(this.ptr, unicodeSetPtr)
    const result = typedArrayFromSet(unicodeSetPtr, 'u32')
    hb.hb_set_destroy(unicodeSetPtr)
    return result
  }

  destroy() {
    hb.hb_face_destroy(this.ptr)
  }
}

export class HarfBuzzFont {
  readonly ptr: Pointer
  readonly unitsPerEM: number

  constructor(face: HarfBuzzFace) {
    this.ptr = hb.hb_font_create(face.ptr)
    this.unitsPerEM = face.getUnitsPerEM()
  }

  setScale(xScale: number, yScale: number) {
    hb.hb_font_set_scale(this.ptr, xScale, yScale)
  }

  destroy() {
    hb.hb_font_destroy(this.ptr)
  }
}

export type HarfBuzzDirection = 'ltr' | 'rtl' | 'ttb' | 'btt'

class GlyphInformation {
  readonly GlyphId: number
  readonly Cluster: number
  readonly XAdvance: number
  readonly YAdvance: number
  readonly XOffset: number
  readonly YOffset: number

  constructor(
    glyphId: number,
    cluster: number,
    xAdvance: number,
    yAdvance: number,
    xOffset: number,
    yOffset: number
  ) {
    this.GlyphId = glyphId
    this.Cluster = cluster
    this.XAdvance = xAdvance
    this.YAdvance = yAdvance
    this.XOffset = xOffset
    this.YOffset = yOffset
  }
}

export class HarfBuzzBuffer {
  readonly ptr: Pointer

  constructor() {
    this.ptr = hb.hb_buffer_create()
  }

  addText(text: string) {
    let str = new CString(text)
    hb.hb_buffer_add_utf8(this.ptr, str.ptr, str.length, 0, str.length)
    str.destroy()
  }

  guessSegmentProperties() {
    hb.hb_buffer_guess_segment_properties(this.ptr)
  }

  setDirection(direction: HarfBuzzDirection) {
    let d = { ltr: 4, rtl: 5, ttb: 6, btt: 7 }[direction]
    hb.hb_buffer_set_direction(this.ptr, d)
  }

  json() {
    let length = hb.hb_buffer_get_length(this.ptr)
    let result = new Array<GlyphInformation>()
    let infosPtr32 = hb.hb_buffer_get_glyph_infos(this.ptr, 0) / 4
    let positionsPtr32 = hb.hb_buffer_get_glyph_positions(this.ptr, 0) / 4
    let infos = hb.heapu32.subarray(infosPtr32, infosPtr32 + 5 * length)
    let positions = hb.heapi32.subarray(
      positionsPtr32,
      positionsPtr32 + 5 * length
    )
    for (let i = 0; i < length; ++i) {
      result.push(
        new GlyphInformation(
          infos[i * 5 + 0],
          infos[i * 5 + 2],
          positions[i * 5 + 0],
          positions[i * 5 + 1],
          positions[i * 5 + 2],
          positions[i * 5 + 3]
        )
      )
    }
    return result
  }

  destroy() {
    hb.hb_buffer_destroy(this.ptr)
  }
}

export function shape(
  text: string,
  font: HarfBuzzFont,
  features: any
): Array<GlyphInformation> {
  let buffer = new HarfBuzzBuffer()
  buffer.addText(text)
  buffer.guessSegmentProperties()
  buffer.shape(font, features)
  let result = buffer.json()
  buffer.destroy()
  return result
}

export function getWidth(
  text: string,
  font: HarfBuzzFont,
  fontSizeInPixel: number,
  features: any
): number {
  let scale = fontSizeInPixel / font.unitsPerEM
  let shapeResult = shape(text, font, features)
  let totalWidth = shapeResult
    .map((glyphInformation) => {
      return glyphInformation.XAdvance
    })
    .reduce((previous, current, i, arr) => {
      return previous + current
    }, 0.0)

  return totalWidth * scale
}

export const harfbuzzFonts = new Map<string, HarfBuzzFont>()

export function loadHarfbuzz(webAssemblyUrl: string): Promise<void> {
  return fetch(webAssemblyUrl)
    .then((response) => {
      return response.arrayBuffer()
    })
    .then((wasm) => {
      return WebAssembly.instantiate(wasm)
    })
    .then((result) => {
      //@ts-ignore
      hb = new HarfBuzzExports(result.instance.exports)
    })
}

export function loadAndCacheFont(
  fontName: string,
  fontUrl: string
): Promise<void> {
  return fetch(fontUrl).then((response) => {
    return response.arrayBuffer().then((blob) => {
      let fontBlob = new Uint8Array(blob)
      let harfbuzzBlob = new HarfBuzzBlob(fontBlob)
      let harfbuzzFace = new HarfBuzzFace(harfbuzzBlob, 0)
      let harfbuzzFont = new HarfBuzzFont(harfbuzzFace)

      harfbuzzFonts.set(fontName, harfbuzzFont)
      harfbuzzFace.destroy()
      harfbuzzBlob.destroy()
    })
  })
}

export function __loadHarfbuzz(wasm: ArrayBuffer): Promise<void> {
  console.log(':::wasm', wasm)
  return new Promise((resolve) => {
    resolve(WebAssembly.instantiate(wasm))
  }).then((result) => {
    //@ts-ignore
    hb = new HarfBuzzExports(result.instance.exports)
  })
}
