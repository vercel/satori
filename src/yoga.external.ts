import { loadYoga as loadYogaUntyped, type Yoga } from 'yoga-layout/load'

let resolveYoga: (yoga: Yoga) => void
const yogaPromise: Promise<Yoga> = new Promise((resolve) => {
  resolveYoga = resolve
})

const loadYoga = loadYogaUntyped as (
  wasm: ArrayBuffer | ArrayBufferLike | WebAssembly.Instance
) => Promise<Yoga>

export function init(
  yogaWasm:
    | ArrayBuffer
    | ArrayBufferLike
    | Buffer
    | WebAssembly.Instance
    | {
        instance: WebAssembly.Instance
      }
) {
  // Buffer
  if ('buffer' in yogaWasm) {
    loadYoga(yogaWasm.buffer).then(resolveYoga)
  } else if ('instance' in yogaWasm) {
    // { instance: WebAssembly.Instance }
    loadYoga(yogaWasm.instance).then(resolveYoga)
  } else {
    // ArrayBuffer or WebAssembly.Instance
    loadYoga(yogaWasm).then(resolveYoga)
  }
}

export function getYoga() {
  return yogaPromise
}
