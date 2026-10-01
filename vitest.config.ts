import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
    // The canvas tests load a native WebGL addon (headless-gl with
    // SwiftShader), which can crash when a worker thread is torn down.
    poolMatchGlobs: [['**/canvas.test.tsx', 'child_process']],
  },
  ssr: {
    noExternal: ['harfbuzzjs'],
  },
})
