/**
 * This configuration ensures that the prebuilt Yoga (asm.js) is not included in
 * the WASM bundle.
 */

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  dts: process.env.NODE_ENV !== 'development',
  minify: process.env.NODE_ENV !== 'development',
  legacyOutput: true,
  format: ['esm'],
  noExternal: [
    'postcss-value-parser',
    'css-to-react-native',
    'css-background-parser',
    '@shuding/opentype.js',
  ],
  esbuildOptions(options) {
    if (process.env.WASM) {
      options.outExtension = {
        '.js': '.wasm.js',
      }
    }
    options.tsconfig = process.env.WASM ? 'tsconfig.wasm.json' : 'tsconfig.json'
    options.legalComments = 'external'
  },
})
