/**
 * Loads the layout engine from a WebAssembly module provided by the user, for
 * `satori/standalone`.
 */

import { createLayoutEngine, type LayoutEngine } from './index.js'
import { loadWasm, type InitInput } from '../load-wasm.js'

export type { InitInput }

let resolveEngine: (engine: LayoutEngine) => void
let rejectEngine: (error: unknown) => void
const enginePromise: Promise<LayoutEngine> = new Promise((resolve, reject) => {
  resolveEngine = resolve
  rejectEngine = reject
})

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
