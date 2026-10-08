/**
 * Loads the layout engine from the WebAssembly module bundled with Satori.
 */

import binary from '../../layout.wasm'
import { createLayoutEngine } from './index.js'

const engine = createLayoutEngine()
const loadingEngine = WebAssembly.instantiate(binary, engine.imports).then(
  ({ instance }) => {
    engine.setInstance(instance)
    return engine
  }
)

export function getLayoutEngine() {
  return loadingEngine
}
