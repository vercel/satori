import { loadYoga as loadYogaUntyped, type Yoga } from 'yoga-layout/load'

const loadYoga = loadYogaUntyped as (options: {
  wasmBinary?: ArrayBuffer | ArrayBufferLike
  instantiateWasm?: (
    imports: WebAssembly.Imports,
    successCallback: (instance: WebAssembly.Instance) => void
  ) => WebAssembly.Exports | false | undefined
}) => Promise<Yoga>

let resolveYoga: (yoga: Yoga) => void
const yogaPromise: Promise<Yoga> = new Promise((resolve) => {
  resolveYoga = resolve
})

export type InitInput =
  | RequestInfo
  | URL
  | Response
  | BufferSource
  | Buffer
  | WebAssembly.Module

async function loadWasm(
  input: InitInput,
  imports: WebAssembly.Imports
): Promise<WebAssembly.WebAssemblyInstantiatedSource> {
  let source: Response | BufferSource | Buffer | WebAssembly.Module = input

  if (
    typeof source === 'string' ||
    (typeof Request === 'function' && source instanceof Request) ||
    (typeof URL === 'function' && source instanceof URL)
  ) {
    source = fetch(source)
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
        throw e
      }
    }

    const bytes = await source.arrayBuffer()
    return await WebAssembly.instantiate(bytes, imports)
  }

  const instantiated = (await WebAssembly.instantiate(
    'buffer' in source ? source.buffer : source,
    imports
  )) as WebAssembly.Instance | WebAssembly.WebAssemblyInstantiatedSource

  if (instantiated instanceof WebAssembly.Instance) {
    return { instance: instantiated, module: source as WebAssembly.Module }
  }

  return instantiated
}

export function init(input: InitInput) {
  loadYoga({
    instantiateWasm(imports, successCallback) {
      loadWasm(input, imports).then(({ instance }) => {
        successCallback(instance)
      })

      return {}
    },
  }).then(resolveYoga)
}

export function getYoga() {
  return yogaPromise
}
