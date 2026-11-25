/**
 * Loads the layout engine from a WebAssembly module provided by the user, for
 * `satori/standalone`.
 */

import initBindings from '../../crates/layout/pkg/layout.js'
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

export function init(input: InitInput) {
  initBindings({ module_or_path: input })
    .then(() => resolveEngine(createLayoutEngine()))
    .catch(rejectEngine)
}

export function getLayoutEngine() {
  return enginePromise
}
