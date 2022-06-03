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
})
