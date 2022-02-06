/**
 * This configuration ensures that the prebuilt Yoga (asm.js) is not included in
 * the WASM bundle.
 */

import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  dts: true,
  minify: true,
  legacyOutput: true,
  format: ['esm'],
  esbuildOptions(options) {
    if (process.env.WASM) {
      options.outExtension = {
        '.js': '.wasm.js',
      }
    }
    options.define = {
      WASM: '' + !!process.env.WASM,
    }
  },
})
