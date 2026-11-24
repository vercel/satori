/**
 * Builds `layout.wasm` from `crates/layout`, with the patches in
 * `crates/layout/patches/<crate>` applied to its dependencies. Requires Rust,
 * see `rust-toolchain.toml`.
 *
 * Run through Turborepo (`pnpm build:wasm`), which caches `layout.wasm`.
 */

import { execFileSync } from 'node:child_process'
import { copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { vendorLayoutCrates } from './vendor-layout-crates.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

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
copyFileSync(
  join(
    root,
    'target',
    'wasm32-unknown-unknown',
    'release',
    'satori_layout.wasm'
  ),
  join(root, 'layout.wasm')
)
