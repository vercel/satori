/**
 * Builds `layout.wasm` and its `wasm-bindgen` bindings in `crates/layout/pkg`
 * from `crates/layout`, with the patches in `crates/layout/patches/<crate>`
 * applied to its dependencies, and optimizes it with `wasm-opt`. Requires
 * Rust, see `rust-toolchain.toml`.
 *
 * Run through Turborepo (`pnpm build:wasm`), which caches the outputs, and
 * installs the `wasm-bindgen` CLI first, see `install-wasm-bindgen.mjs`.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { wasmBindgenPath } from './install-wasm-bindgen.mjs'
import { vendorLayoutCrates } from './vendor-layout-crates.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = join(root, 'crates', 'layout', 'pkg')
const require = createRequire(import.meta.url)

await vendorLayoutCrates()
execFileSync(
  'cargo',
  [
    'build',
    '--package=satori-layout',
    '--release',
    '--target=wasm32-unknown-unknown',
    '--locked',
  ],
  { cwd: root, stdio: 'inherit' }
)

const wasmBindgen = wasmBindgenPath()
if (!existsSync(wasmBindgen)) {
  throw new Error(
    'The wasm-bindgen CLI is not installed, run `pnpm build:wasm` instead'
  )
}
rmSync(pkg, { recursive: true, force: true })
execFileSync(
  wasmBindgen,
  [
    join(
      root,
      'target',
      'wasm32-unknown-unknown',
      'release',
      'satori_layout.wasm'
    ),
    `--out-dir=${pkg}`,
    '--out-name=layout',
    // Loaded by `src/layout-engine/wasm.*.ts`, which always pass the module.
    '--target=web',
    // Without `new URL('layout_bg.wasm', import.meta.url)`, which bundlers of
    // Satori would try to resolve, and isn't available in CommonJS.
    '--omit-default-module-path',
  ],
  { cwd: root, stdio: 'inherit' }
)
rmSync(join(pkg, 'layout_bg.wasm.d.ts'), { force: true })

// From the `binaryen` package, which is compiled to JavaScript. Cargo only
// strips debug info, so that wasm-bindgen can read the `target_features`
// section, which `wasm-opt` also reads and then strips with the rest.
const wasmOpt = join(
  dirname(require.resolve('binaryen/package.json')),
  'bin',
  'wasm-opt'
)
execFileSync(
  process.execPath,
  [
    wasmOpt,
    join(pkg, 'layout_bg.wasm'),
    '-Oz',
    '--strip-debug',
    '--strip-producers',
    '--strip-target-features',
    '-o',
    join(root, 'layout.wasm'),
  ],
  { cwd: root, stdio: 'inherit' }
)
rmSync(join(pkg, 'layout_bg.wasm'))
