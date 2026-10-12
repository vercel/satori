import { readFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(import.meta.url)
const esbuildPath = require.resolve('esbuild', {
  paths: [dirname(require.resolve('tsup'))],
})
const { build } = await import(pathToFileURL(esbuildPath))

for (const entry of [
  'index.js',
  'index.cjs',
  'standalone.js',
  'standalone.cjs',
  'experimental.js',
  'experimental.cjs',
]) {
  const source = readFileSync(
    new URL(`../dist/${entry}`, import.meta.url),
    'utf8'
  )

  if (source.includes('process.env.SATORI_STANDALONE')) {
    throw new Error(
      `${entry} reads process.env.SATORI_STANDALONE at runtime; ` +
        'the browser build must replace this flag at build time.'
    )
  }

  if (/(?:require\(|from\s*)["']harfbuzzjs["']/.test(source)) {
    throw new Error(
      `${entry} imports harfbuzzjs at runtime; it must be bundled instead. ` +
        'This repo patches harfbuzzjs to drop its Node fs branch and inline ' +
        'hb.wasm, and that patch does not reach consumers, so leaving the ' +
        'import external breaks every bundler.'
    )
  }

  if (entry.endsWith('.js') && source.includes('__dirname')) {
    throw new Error(
      `${entry} refers to __dirname. Node ESM does not define it, so importing ` +
        'the bundle throws before Satori can render.'
    )
  }

  if (decodesWasmWithUnguardedBuffer(source)) {
    throw new Error(
      `${entry} decodes wasm with Buffer.from before checking that Buffer ` +
        'exists. Browsers do not define Buffer, so importing the bundle ' +
        'throws before Satori can render.'
    )
  }
}

// HarfBuzz already decodes its wasm with `typeof Buffer == "function" ? …`.
// An unguarded `Buffer.from` is the layout engine, and it runs on import.
function decodesWasmWithUnguardedBuffer(source) {
  const needle = 'Buffer.from'
  let from = 0
  while (from < source.length) {
    const index = source.indexOf(needle, from)
    if (index === -1) return false
    const before = source.slice(Math.max(0, index - 120), index)
    if (!before.includes('typeof Buffer')) return true
    from = index + needle.length
  }
  return false
}

const outfile = new URL('../.tmp/browser-build.js', import.meta.url)

try {
  await build({
    entryPoints: [new URL('../dist/index.js', import.meta.url).pathname],
    bundle: true,
    platform: 'browser',
    format: 'esm',
    outfile: outfile.pathname,
  })
} finally {
  rmSync(outfile, { force: true })
}
