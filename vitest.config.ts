import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // src/jsx ships no jsx-dev-runtime, so the automatic runtime's dev variant has
  // nothing to resolve to. Keep the transform on the production runtime.
  // Vite 8 transforms with oxc, so the esbuild option no longer applies here.
  oxc: {
    jsx: {
      development: false,
    },
  },
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  ssr: {
    noExternal: ['harfbuzzjs'],
  },
})
