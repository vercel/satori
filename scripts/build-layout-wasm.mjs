/**
 * Builds `layout.wasm` from `crates/layout`, with the patches in
 * `crates/layout/patches` applied to Taffy. Requires Rust with the
 * `wasm32-unknown-unknown` target.
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

const TAFFY_VERSION = '0.14.0'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const crate = join(root, 'crates', 'layout')
const target = join(crate, 'target')
const taffy = join(target, 'taffy')
const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: 'inherit', ...options })

// Download Taffy and apply the patches.
rmSync(taffy, { recursive: true, force: true })
mkdirSync(taffy, { recursive: true })
const archive = join(target, `taffy-${TAFFY_VERSION}.crate`)
if (!existsSync(archive)) {
  run('curl', [
    '--fail',
    '--location',
    '--silent',
    '--output',
    archive,
    `https://static.crates.io/crates/taffy/taffy-${TAFFY_VERSION}.crate`,
  ])
}
run('tar', ['-xzf', archive, '-C', taffy, '--strip-components=1'])
for (const patch of readdirSync(join(crate, 'patches')).sort()) {
  run('patch', ['--quiet', '-p1', '-i', join(crate, 'patches', patch)], {
    cwd: taffy,
  })
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
