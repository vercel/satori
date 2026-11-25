/**
 * Downloads the crates that `crates/layout` patches into `vendor/<crate>`, and
 * applies the patches in `crates/layout/patches/<crate>`. Only needs Node.js,
 * because build machines, like Vercel's, don't always have `curl`, `tar` or
 * `patch`.
 *
 * Cargo, and so Turborepo, can't load the workspace until these exist, so the
 * `package.json` scripts run this before `turbo`. Builds of `layout.wasm` run
 * it again, so that they always use the current patches.
 */

import { applyPatch, parsePatch } from 'diff'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as tar from 'tar'

/** The versions of the patched crates, by name. */
const PATCHED_CRATES = {
  taffy: '0.14.0',
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const crate = join(root, 'crates', 'layout')
const vendor = join(root, 'vendor')

/** `a/src/lib.rs` to `src/lib.rs`, like `patch -p1`. */
const stripPrefix = (fileName) => fileName.replace(/^[^/]+\//, '')

export async function vendorLayoutCrates() {
  for (const [name, version] of Object.entries(PATCHED_CRATES)) {
    const source = join(vendor, name)
    rmSync(source, { recursive: true, force: true })
    mkdirSync(source, { recursive: true })
    const archive = join(vendor, `${name}-${version}.crate`)
    if (!existsSync(archive)) {
      const url = `https://static.crates.io/crates/${name}/${name}-${version}.crate`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download ${url}: ${response.status}`)
      }
      writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
    }
    // Extracted as modified now, so that Cargo rebuilds the crate when patches
    // are removed too.
    tar.x({ file: archive, cwd: source, strip: 1, noMtime: true, sync: true })
    const patches = join(crate, 'patches', name)
    for (const patch of readdirSync(patches).sort()) {
      const text = readFileSync(join(patches, patch), 'utf8')
      for (const filePatch of parsePatch(text)) {
        const file = join(source, stripPrefix(filePatch.oldFileName))
        const patched = applyPatch(readFileSync(file, 'utf8'), filePatch)
        if (patched === false) {
          throw new Error(`Failed to apply ${patch} to ${file}`)
        }
        writeFileSync(join(source, stripPrefix(filePatch.newFileName)), patched)
      }
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await vendorLayoutCrates()
}
