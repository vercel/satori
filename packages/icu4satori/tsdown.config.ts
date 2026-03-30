import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  dts: true,
  clean: true,
  outDir: 'dist',
  inputOptions: {
    resolve: {
      extensions: ['.ts', '.js', '.mjs'],
    },
  },
})
