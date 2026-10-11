import type { InitInput } from './wasm.external.js'
import type { LayoutEngine } from './index.js'

export type { InitInput }

/**
 * Initializes `satori/standalone` with the `layout.wasm` module. The default
 * build bundles it.
 */
export function init(input: InitInput) {
  if (process.env.SATORI_STANDALONE === '1') {
    return import('./wasm.external.js').then((mod) => mod.init(input))
  } else {
    // Do nothing. It's bundled.
  }
}

export function getLayoutEngine(): Promise<LayoutEngine> {
  if (process.env.SATORI_STANDALONE === '1') {
    return import('./wasm.external.js').then((mod) => mod.getLayoutEngine())
  } else {
    return import('./wasm.bundled.js').then((mod) => mod.getLayoutEngine())
  }
}

if (process.env.SATORI_STANDALONE !== '1') {
  // Preload the layout engine in bundled mode.
  import('./wasm.bundled.js')
}
