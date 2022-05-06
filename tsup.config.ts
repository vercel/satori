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
  esbuildOptions(options) {
    if (process.env.BUILD_TYPE) {
      options.outExtension = {
        '.js': `.${process.env.BUILD_TYPE}.js`,
      }
    }
    options.tsconfig = process.env.BUILD_TYPE ? `tsconfig.${process.env.BUILD_TYPE}.json` : 'tsconfig.json'
  },
})
