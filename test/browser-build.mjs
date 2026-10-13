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

  // Browsers do not define `Buffer`. Import the browser bundle without it and
  // render once, so a Node-only decoder fails here the way it fails there.
  delete globalThis.Buffer
  const { default: satori } = await import(outfile.href)
  const font = new Uint8Array(
    readFileSync(new URL('./assets/Roboto-Regular.ttf', import.meta.url))
  )
  await satori(
    { type: 'div', props: { children: 'Hi', style: { display: 'flex' } } },
    {
      width: 100,
      height: 40,
      fonts: [{ name: 'Roboto', data: font, weight: 400, style: 'normal' }],
    }
  )
} finally {
  rmSync(outfile, { force: true })
}
