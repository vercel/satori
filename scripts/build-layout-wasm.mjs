/**
 * Builds `layout.wasm` from `crates/layout`, with the patches in
 * `crates/layout/patches/<crate>` applied to its dependencies. Requires Rust
 * with the `wasm32-unknown-unknown` target.
 */

import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The versions of the patched crates, by name. */
const PATCHED_CRATES = {
  taffy: '0.14.0',
  'woff2-patched': '0.4.0',
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const crate = join(root, 'crates', 'layout')
const target = join(crate, 'target')
const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: 'inherit', ...options })

// Download the patched crates and apply the patches.
for (const [name, version] of Object.entries(PATCHED_CRATES)) {
  const source = join(target, name)
  rmSync(source, { recursive: true, force: true })
  mkdirSync(source, { recursive: true })
  const archive = join(target, `${name}-${version}.crate`)
  if (!existsSync(archive)) {
    run('curl', [
      '--fail',
      '--location',
      '--silent',
      '--output',
      archive,
      `https://static.crates.io/crates/${name}/${name}-${version}.crate`,
    ])
  }
  // Extracted as modified now, so that Cargo rebuilds the crate when patches
  // are removed too.
  run('tar', ['-xzmf', archive, '-C', source, '--strip-components=1'])
  const patches = join(crate, 'patches', name)
  for (const patch of readdirSync(patches).sort()) {
    run('patch', ['--quiet', '-p1', '-i', join(patches, patch)], {
      cwd: source,
    })
  }
}

run(
  'cargo',
  ['build', '--release', '--target', 'wasm32-unknown-unknown', '--locked'],
  { cwd: crate }
)
copyFileSync(
  join(target, 'wasm32-unknown-unknown', 'release', 'satori_layout.wasm'),
  join(root, 'layout.wasm')
)
