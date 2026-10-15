import type { InitInput } from './wasm.external.js'
import type { LayoutEngine } from './index.js'
import { setHarfBuzzSource } from '../harfbuzz.js'

export type { InitInput }

export interface InitOptions {
  /** The `layout.wasm` module. */
  layout: InitInput
  /**
   * The `harfbuzz.wasm` module. Without it, Satori compiles the HarfBuzz
   * module bundled in `satori/standalone`, which runtimes that only run
   * WebAssembly modules uploaded with the code (like Cloudflare Workers)
   * don't allow.
   */
  harfbuzz?: InitInput
}

function isInitOptions(input: InitInput | InitOptions): input is InitOptions {
  return typeof input === 'object' && input !== null && 'layout' in input
}

/**
 * Initializes `satori/standalone` with the `layout.wasm` module, and optionally
 * the `harfbuzz.wasm` module. The default build bundles them.
 */
export function init(input: InitInput | InitOptions) {
  if (process.env.SATORI_STANDALONE === '1') {
    const options: InitOptions = isInitOptions(input)
      ? input
      : { layout: input }

    // Set it now, so renders that don't wait for `init` use it too.
    if (options.harfbuzz !== undefined) setHarfBuzzSource(options.harfbuzz)

    return import('./wasm.external.js').then((mod) => mod.init(options.layout))
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
