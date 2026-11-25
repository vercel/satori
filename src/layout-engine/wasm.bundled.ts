/**
 * Loads the layout engine from the WebAssembly module bundled with Satori.
 */

import binary from '../../layout.wasm'
import init from '../../crates/layout/pkg/layout.js'
import { createLayoutEngine } from './index.js'

const loadingEngine = init({ module_or_path: binary }).then(() =>
  createLayoutEngine()
)

export function getLayoutEngine() {
  return loadingEngine
}
