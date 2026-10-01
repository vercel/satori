/**
 * Prepares `.webgl-libs/` for the `/api/shader-card` route:
 *
 * - `gl/`: a copy of headless-gl's runtime files. It loads its ANGLE and
 *   SwiftShader libraries from its own directory at runtime, which file
 *   tracing can't see, and tracing globs can't go through `node_modules` in
 *   this workspace (its symlinks loop). A plain directory can be included.
 * - On Linux x64, the X11 client libraries that ANGLE's `libGLESv2.so` links
 *   against, with their dependencies. No X server is used, but the Vercel
 *   function runtime doesn't have them, so the route preloads them in the
 *   order listed in `load-order.json`.
 */

import { execSync } from 'node:child_process'
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PLAYGROUND_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
)
const OUTPUT_DIR = path.join(PLAYGROUND_DIR, '.webgl-libs')

rmSync(OUTPUT_DIR, { recursive: true, force: true })
mkdirSync(OUTPUT_DIR, { recursive: true })

// 1. headless-gl's runtime files.
const glSource = path.dirname(
  createRequire(path.join(PLAYGROUND_DIR, 'package.json')).resolve(
    'gl/package.json'
  )
)
const glOutput = path.join(OUTPUT_DIR, 'gl')
for (const file of ['package.json', 'index.js']) {
  cpSync(path.join(glSource, file), path.join(glOutput, file))
}
cpSync(
  path.join(glSource, 'src', 'javascript'),
  path.join(glOutput, 'src', 'javascript'),
  {
    recursive: true,
  }
)
const releaseDir = path.join(glSource, 'build', 'Release')
for (const file of readdirSync(releaseDir)) {
  const source = path.join(releaseDir, file)
  if (statSync(source).isFile()) {
    cpSync(source, path.join(glOutput, 'build', 'Release', file))
  }
}
console.log('[bundle-webgl-libs] Copied headless-gl.')

// 2. X11 client libraries, only needed on Linux x64.
if (process.platform !== 'linux' || process.arch !== 'x64') {
  process.exit(0)
}

const REQUIRED = ['libX11.so.6', 'libXext.so.6', 'libxcb.so.1']
const SEARCH_DIRS = [
  '/usr/lib64',
  '/lib64',
  '/usr/lib/x86_64-linux-gnu',
  '/lib/x86_64-linux-gnu',
]
// Always available in the function runtime.
const SYSTEM_LIBRARIES = new Set([
  'ld-linux-x86-64.so.2',
  'libc.so.6',
  'libdl.so.2',
  'libgcc_s.so.1',
  'libm.so.6',
  'libpthread.so.0',
  'librt.so.1',
  'libstdc++.so.6',
])

function findLibrary(name) {
  for (const dir of SEARCH_DIRS) {
    const file = path.join(dir, name)
    if (existsSync(file)) return file
  }
}

/** Read the DT_NEEDED entries of a 64-bit little-endian ELF file. */
function getNeededLibraries(file) {
  const elf = readFileSync(file)
  const sectionsOffset = Number(elf.readBigUInt64LE(0x28))
  const sectionSize = elf.readUInt16LE(0x3a)
  const sectionCount = elf.readUInt16LE(0x3c)
  const sections = []
  for (let i = 0; i < sectionCount; i++) {
    const offset = sectionsOffset + i * sectionSize
    sections.push({
      type: elf.readUInt32LE(offset + 4),
      offset: Number(elf.readBigUInt64LE(offset + 0x18)),
      size: Number(elf.readBigUInt64LE(offset + 0x20)),
      link: elf.readUInt32LE(offset + 0x28),
    })
  }

  const dynamic = sections.find((section) => section.type === 6) // SHT_DYNAMIC
  if (!dynamic) return []
  const strings = sections[dynamic.link]
  const needed = []
  for (let i = dynamic.offset; i < dynamic.offset + dynamic.size; i += 16) {
    const tag = Number(elf.readBigInt64LE(i))
    if (tag === 0) break
    if (tag === 1) {
      const start = strings.offset + Number(elf.readBigUInt64LE(i + 8))
      needed.push(elf.toString('latin1', start, elf.indexOf(0, start)))
    }
  }
  return needed
}

if (REQUIRED.some((name) => !findLibrary(name))) {
  console.log('[bundle-webgl-libs] Installing libX11 and libXext with dnf...')
  execSync('dnf install -y libX11 libXext', { stdio: 'inherit' })
}

const loadOrder = []
const visited = new Set()

function bundle(name) {
  if (visited.has(name) || SYSTEM_LIBRARIES.has(name)) return
  visited.add(name)

  const file = findLibrary(name)
  if (!file) throw new Error(`[bundle-webgl-libs] Cannot find ${name}.`)
  for (const dependency of getNeededLibraries(file)) bundle(dependency)

  // Copies the target of versioned symlinks such as libX11.so.6.
  copyFileSync(file, path.join(OUTPUT_DIR, name))
  loadOrder.push(name)
}

for (const name of REQUIRED) bundle(name)
writeFileSync(
  path.join(OUTPUT_DIR, 'load-order.json'),
  JSON.stringify(loadOrder, null, 2)
)
console.log(`[bundle-webgl-libs] Bundled ${loadOrder.join(', ')}.`)
