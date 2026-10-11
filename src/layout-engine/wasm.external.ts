/**
 * Loads the layout engine from a WebAssembly module provided by the user, for
 * `satori/standalone`.
 */

import { createLayoutEngine, type LayoutEngine } from './index.js'

let resolveEngine: (engine: LayoutEngine) => void
let rejectEngine: (error: unknown) => void
const enginePromise: Promise<LayoutEngine> = new Promise((resolve, reject) => {
  resolveEngine = resolve
  rejectEngine = reject
})

export type InitInput =
  | string
  | Request
  | URL
  | Response
  | BufferSource
  | Buffer
  | WebAssembly.Module
  | Promise<Response | BufferSource | Buffer | WebAssembly.Module>

async function loadWasm(
  input: InitInput,
  imports: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
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

  if (typeof Response === 'function' && source instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(source, imports)
      } catch (e) {
        if (source.headers.get('Content-Type') !== 'application/wasm') {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            e
          )
        }
      }
    }

    const bytes = await source.arrayBuffer()
    return await WebAssembly.instantiate(bytes, imports)
  }

  const instantiated = (await WebAssembly.instantiate(
    'buffer' in source
      ? source.buffer.slice(
          source.byteOffset,
          source.byteOffset + source.byteLength
        )
      : source,
    imports
  )) as WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource

  if (instantiated instanceof WebAssembly.Instance) {
    return { instance: instantiated, module: source as WebAssembly.Module }
  }

  return instantiated
}

export function init(input: InitInput) {
  const engine = createLayoutEngine()
  loadWasm(input, engine.imports)
    .then(({ instance }) => {
      engine.setInstance(instance)
      resolveEngine(engine)
    })
    .catch(rejectEngine)
}

export function getLayoutEngine() {
  return enginePromise
}
