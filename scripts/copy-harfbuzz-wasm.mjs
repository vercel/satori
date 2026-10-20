// `satori/standalone` users can pass this module to `init` on runtimes that
// can't compile the bundled HarfBuzz bytes. It must be the binary that the
// bundled HarfBuzz glue code was built for.
import { copyFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

copyFileSync(
  require.resolve('harfbuzzjs/hb.wasm'),
  new URL('../harfbuzz.wasm', import.meta.url)
)
