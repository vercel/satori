// Deferred WASM loader for icu4satori.
// Follows the same pattern as satori's yoga.external.ts:
// user calls init(wasmInput) before using any ICU4X API.
// No top-level await, no runtime env detection.

/** WASM exports shape: standard exports + memory for string reading. */
interface WasmExports extends WebAssembly.Exports {
  memory: WebAssembly.Memory
  diplomat_init(): void
}

/** Read a UTF-8 string from WASM memory. Inlined from diplomat-runtime. */
function readString8(wasm: WasmExports, ptr: number, len: number): string {
  const buf = new Uint8Array(wasm.memory.buffer, ptr, len)
  return new TextDecoder('utf-8').decode(buf)
}

/** WASM instance exports, set after init(). */
let realWasm: WasmExports | null = null

const imports: WebAssembly.Imports = {
  env: {
    diplomat_console_debug_js(ptr: number, len: number) {
      console.debug(readString8(wasm, ptr, len))
    },
    diplomat_console_error_js(ptr: number, len: number) {
      console.error(readString8(wasm, ptr, len))
    },
    diplomat_console_info_js(ptr: number, len: number) {
      console.info(readString8(wasm, ptr, len))
    },
    diplomat_console_log_js(ptr: number, len: number) {
      console.log(readString8(wasm, ptr, len))
    },
    diplomat_console_warn_js(ptr: number, len: number) {
      console.warn(readString8(wasm, ptr, len))
    },
    diplomat_throw_error_js(ptr: number, len: number) {
      throw new Error(readString8(wasm, ptr, len))
    },
  },
}

export type InitInput =
  | string
  | Request
  | URL
  | Response
  | BufferSource
  | Buffer
  | WebAssembly.Module
  | Promise<Response | BufferSource | Buffer | WebAssembly.Module>

/**
 * Load ICU4X WASM from user-provided input.
 * Accepts the same input types as satori's yoga init().
 */
export async function initWasm(input: InitInput): Promise<void> {
  if (realWasm) return // already initialized

  let source: Response | BufferSource | Buffer | WebAssembly.Module

  if (
    typeof input === 'string' ||
    (typeof Request === 'function' && input instanceof Request) ||
    (typeof URL === 'function' && input instanceof URL)
  ) {
    source = await fetch(input)
  } else {
    source = await input
  }

  let instance: WebAssembly.Instance | undefined

  if (typeof Response === 'function' && source instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        const result = await WebAssembly.instantiateStreaming(source, imports)
        instance = result.instance
      } catch (e) {
        if (source.headers.get('Content-Type') !== 'application/wasm') {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            e
          )
        } else {
          throw e
        }
      }
    }
    if (!instance) {
      const bytes = await source.arrayBuffer()
      const result = await WebAssembly.instantiate(bytes, imports)
      instance = result.instance
    }
  } else {
    const instantiated = (await WebAssembly.instantiate(
      'buffer' in source
        ? source.buffer.slice(
            source.byteOffset,
            source.byteOffset + source.byteLength
          )
        : source,
      imports
    )) as WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource

    instance =
      instantiated instanceof WebAssembly.Instance
        ? instantiated
        : instantiated.instance
  }

  realWasm = instance.exports as WasmExports
  realWasm.diplomat_init()
}

// Proxy that delegates to the real WASM instance.
// All diplomat-generated vendor files do `import wasm from "./diplomat-wasm.mjs"`
// and access wasm.xxx() at call time (inside methods, not at import time).
// The Proxy ensures these calls work after init() and throw clearly before.
const wasm: WasmExports = new Proxy({} as WasmExports, {
  get(_target, prop) {
    if (typeof prop !== 'string' || prop === 'then') return undefined
    if (!realWasm) {
      throw new Error(
        `icu4satori: WASM not initialized. Call init() before using ICU4X APIs. (accessed: ${prop})`
      )
    }
    return realWasm[prop]
  },
})

export default wasm
