import { defineConfig } from 'tsup'
import { join } from 'path'

const isStandaloneBuild = !!process.env.SATORI_STANDALONE

export default defineConfig({
  entry: {
    [isStandaloneBuild ? 'standalone' : 'index']: 'src/index.ts',
    'jsx/index': 'src/jsx/index.ts',
    'jsx/jsx-runtime': 'src/jsx/jsx-runtime.ts',
  },
  splitting: false,
  sourcemap: true,
  target: 'node16',
  dts: process.env.NODE_ENV !== 'development' && {
    resolve: ['./types'],
  },
  minify: process.env.NODE_ENV !== 'development',
  format: ['esm', 'cjs'],
  noExternal: ['emoji-regex-xs', 'yoga-layout'],
  esbuildOptions(options) {
    options.tsconfig = 'tsconfig.json'
    options.legalComments = 'external'
  },
  // Standalone build: satori bundles everything with zero runtime deps.
  // The consumer provides the WASM binary manually via `init(wasmBinary)`.
  //
  // Problem: yoga-layout ships "yoga-wasm-base64-esm.js" which embeds the
  // entire WASM binary as a base64 string (~120KB). Even though the standalone
  // build uses `instantiateWasm` to load WASM externally (see yoga.external.ts),
  // esbuild still bundles the base64 file because yoga-layout's load.js
  // imports it statically.
  //
  // Solution: during standalone builds, this plugin intercepts that import and
  // swaps it with "src/vendor/yoga-wasm-esm.js" — a lightweight WASM glue
  // loader (no embedded binary) that works with the external instantiation flow.
  esbuildPlugins: isStandaloneBuild
    ? [
        {
          name: 'swap-yoga-wasm',
          setup(build) {
            build.onResolve(
              { filter: /yoga-wasm-base64-esm/ },
              () => {
                return {
                  path: join(__dirname, 'src', 'vendor', 'yoga-wasm-esm.js'),
                }
              }
            )
          },
        },
      ]
    : [],
  env: isStandaloneBuild
    ? {
        SATORI_STANDALONE: '1',
      }
    : {},
})
