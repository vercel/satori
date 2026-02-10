import { loadYoga as loadYogaUntyped, type Yoga } from 'yoga-layout/load'

const loadYoga = loadYogaUntyped as (options: {
  wasmBinary?: ArrayBuffer | ArrayBufferLike
  instantiateWasm?: (
    imports: WebAssembly.Imports,
    successCallback: (instance: WebAssembly.Instance) => void
  ) => WebAssembly.Exports | false | undefined
}) => Promise<Yoga>

let resolveYoga: (yoga: Yoga) => void
let rejectYoga: (error: unknown) => void
const yogaPromise: Promise<Yoga> = new Promise((resolve, reject) => {
  resolveYoga = resolve
  rejectYoga = reject
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
    source = await fetch(source)
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
  loadYoga({
    instantiateWasm(imports, successCallback) {
      loadWasm(input, imports)
        .then(({ instance }) => {
          successCallback(instance)
        })
        .catch(rejectYoga)

      return {}
    },
  })
    .then(resolveYoga)
    .catch(rejectYoga)
}

export function getYoga() {
  return yogaPromise
}
