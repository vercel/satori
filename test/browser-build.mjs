import { readFileSync } from 'node:fs'

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
