import { defineConfig, mergeConfig } from 'vitest/config'
import vitestConfig from './vitest.config'

export default mergeConfig(
  vitestConfig,
  defineConfig({
    esbuild: {
      jsx: 'automatic',
      jsxImportSource: new URL('./src/jsx', import.meta.url).href,
    },
  })
)
