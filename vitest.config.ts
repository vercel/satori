import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@yoga',
        replacement: path.resolve(__dirname, 'src', 'yoga', 'yoga-prebuilt.ts'),
      },
    ],
  },
})
