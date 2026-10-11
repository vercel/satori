import { readFileSync } from 'fs'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    {
      // Import `.wasm` files as bytes, like the esbuild `binary` loader in
      // `tsup.config.ts`.
      name: 'wasm-binary',
      enforce: 'pre',
      load(id) {
        if (!id.endsWith('.wasm')) return
        const base64 = readFileSync(id).toString('base64')
        return `export default Uint8Array.from(Buffer.from(${JSON.stringify(
          base64
        )}, 'base64'))`
      },
    },
  ],
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
