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
