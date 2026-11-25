/**
 * Installs the `wasm-bindgen` CLI used by `scripts/build-layout-wasm.mjs` into
 * `vendor/wasm-bindgen-cli`.
 *
 * Downloads a prebuilt version, verified via checksums if possible, falling
 * back to building from source.
 *
 * We install this automatically instead of asking the user to install a
 * system-wide CLI in part because the installed CLI needs to be compatible the
 * wasm-bindgen dependency's schema version. There is no npm package, so we must
 * manually install it.
 */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as tar from 'tar'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Must have the same schema version as the `wasm-bindgen` crate in
 * `crates/layout/Cargo.toml`, which changes in most releases. Update both
 * together, along with the checksums in `PREBUILT_TARGETS`.
 */
const VERSION = '0.2.130'

/**
 * The targets of the prebuilt CLIs by `${platform}-${arch}`, with the SHA-256
 * checksums from the `.sha256sum` files of the GitHub release.
 */
const PREBUILT_TARGETS = {
  'darwin-arm64': {
    target: 'aarch64-apple-darwin',
    sha256: 'b90ddb9357f584b1af897d58ad77e4cce2b48fc17e2a967bc249a87f72809444',
  },
  'darwin-x64': {
    target: 'x86_64-apple-darwin',
    sha256: 'eb209c115b7cb95832423c1aa3f4d06d6c53f63ef74fc4b6fb79ef0b2eea5f10',
  },
  'linux-arm64': {
    target: 'aarch64-unknown-linux-musl',
    sha256: '99ffc93ce80081b91632e2b539b782821a8f3439ab0fddc645287462b2f55d3d',
  },
  'linux-x64': {
    target: 'x86_64-unknown-linux-musl',
    sha256: '9687f3bb551b9f66f37ed32a40d7913a00f7962db653054e56857bc306c3227f',
  },
  'win32-x64': {
    target: 'x86_64-pc-windows-msvc',
    sha256: '844d23f1b56097549b936dd2e0d561fadebc1e8c9e985d5068b6b919654104ad',
  },
}

/** The path of the installed `wasm-bindgen` CLI. */
export function wasmBindgenPath() {
  // By platform, because `vendor` may be shared, e.g. with a container.
  const dir = join(
    root,
    'vendor',
    'wasm-bindgen-cli',
    `${VERSION}-${process.platform}-${process.arch}`
  )
  const exe = process.platform === 'win32' ? '.exe' : ''
  return join(dir, 'bin', `wasm-bindgen${exe}`)
}

export async function installWasmBindgen() {
  const bin = wasmBindgenPath()
  if (existsSync(bin)) return

  const dir = dirname(dirname(bin))
  const prebuilt = PREBUILT_TARGETS[`${process.platform}-${process.arch}`]
  if (!prebuilt) {
    execFileSync(
      'cargo',
      ['install', 'wasm-bindgen-cli', `--version=${VERSION}`, `--root=${dir}`],
      { stdio: 'inherit' }
    )
    return
  }

  const name = `wasm-bindgen-${VERSION}-${prebuilt.target}`
  const url = `https://github.com/wasm-bindgen/wasm-bindgen/releases/download/${VERSION}/${name}.tar.gz`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`)
  }
  const archive = Buffer.from(await response.arrayBuffer())
  const actual = createHash('sha256').update(archive).digest('hex')
  if (actual !== prebuilt.sha256) {
    throw new Error(
      `The checksum of ${url} is ${actual}, but should be ${prebuilt.sha256}`
    )
  }

  const extracted = join(dir, 'extracted')
  rmSync(extracted, { recursive: true, force: true })
  mkdirSync(extracted, { recursive: true })
  await new Promise((resolve, reject) => {
    const stream = tar.x({ cwd: extracted, strip: 1 })
    stream.on('finish', resolve).on('error', reject)
    stream.end(archive)
  })
  // Moved into place last, so that an interrupted install isn't used.
  mkdirSync(dirname(bin), { recursive: true })
  renameSync(join(extracted, basename(bin)), bin)
  rmSync(extracted, { recursive: true, force: true })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await installWasmBindgen()
}
