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

  if (entry.endsWith('.js') && source.includes('__dirname')) {
    throw new Error(
      `${entry} refers to __dirname. Node ESM does not define it, so importing ` +
        'the bundle throws before Satori can render.'
    )
  }
}

// @vercel/og inlines Satori with esbuild's `node` platform for its edge build,
// so dependencies resolve to their `node` export conditions. Edge runtimes
// cannot load `module`, which e.g. fflate's Node build imports.
for (const entry of ['index.js', 'experimental.js']) {
  const { outputFiles } = await build({
    entryPoints: [new URL(`../dist/${entry}`, import.meta.url).pathname],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    // See the note on the browser build below.
    external: ['harfbuzzjs'],
  })
  if (
    /(?:from\s*|import\(|require\()["'](?:node:)?module["']/.test(
      outputFiles[0].text
    )
  ) {
    throw new Error(
      `${entry} pulls in the Node \`module\` builtin when bundled for Node, ` +
        'which breaks edge runtimes. Import the browser build of the ' +
        'dependency instead.'
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
    // harfbuzzjs locates its wasm with `new URL(..., import.meta.url)`, which
    // esbuild doesn't rewrite, so bundling it here would break its loader.
    // Consumer bundlers that copy the wasm load the package from npm too.
    external: ['harfbuzzjs'],
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
