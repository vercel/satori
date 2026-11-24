/**
 * Downloads the crates that `crates/layout` patches into
 * `vendor/<crate>`, and applies the patches in
 * `crates/layout/patches/<crate>`.
 *
 * Cargo, and so Turborepo, can't load the workspace until these exist, so the
 * `package.json` scripts run this before `turbo`. Builds of `layout.wasm` run
 * it again, so that they always use the current patches.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The versions of the patched crates, by name. */
const PATCHED_CRATES = {
  taffy: '0.14.0',
  'woff2-patched': '0.4.0',
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const crate = join(root, 'crates', 'layout')
const vendor = join(root, 'vendor')
const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: 'inherit', ...options })

export function vendorLayoutCrates() {
  for (const [name, version] of Object.entries(PATCHED_CRATES)) {
    const source = join(vendor, name)
    rmSync(source, { recursive: true, force: true })
    mkdirSync(source, { recursive: true })
    const archive = join(vendor, `${name}-${version}.crate`)
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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  vendorLayoutCrates()
}
