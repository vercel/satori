import { defineConfig } from 'tsup'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { replace } from 'esbuild-plugin-replace'

const isStandaloneBuild = !!process.env.SATORI_STANDALONE

export default defineConfig({
  entry: {
    [isStandaloneBuild ? 'standalone' : 'index']: 'src/index.ts',
    ...(isStandaloneBuild ? {} : { experimental: 'src/experimental/index.ts' }),
    'jsx/index': 'src/jsx/index.ts',
    'jsx/jsx-runtime': 'src/jsx/jsx-runtime.ts',
  },
  splitting: false,
  sourcemap: true,
  target: 'node16',
  dts: process.env.NODE_ENV !== 'development' && {
    resolve: ['twrnc', './tw-config', './types'],
  },
  minify: process.env.NODE_ENV !== 'development',
  format: ['esm', 'cjs'],
  noExternal: ['twrnc', 'emoji-regex-xs', 'fflate'],
  esbuildOptions(options) {
    options.tsconfig = 'tsconfig.json'
    options.legalComments = 'external'
  },
  // Always replace this flag at build time. Leaving it unresolved in the
  // default build makes the browser bundle access the Node-only `process`
  // global while selecting the layout engine loader.
  env: {
    SATORI_STANDALONE: isStandaloneBuild ? '1' : '0',
  },
  esbuildPlugins: [
    {
      // fflate's `node` export condition (which tsup and consumers bundling
      // Satori for Node, like @vercel/og, select) imports the `module` builtin
      // to reach `worker_threads`. Edge runtimes can't load it. Satori only
      // uses the sync APIs, which are the same in the browser build. `src`
      // can't import `fflate/browser` directly: that file is ESM but fflate
      // isn't `"type": "module"`, so Node 20 loads it as CommonJS.
      name: 'fflate-browser',
      setup(build) {
        build.onResolve({ filter: /^fflate$/ }, (args) =>
          build.resolve('fflate/browser', {
            kind: args.kind,
            resolveDir: args.resolveDir,
          })
        )
      },
    },
    {
      // The default build bundles `layout.wasm` as bytes. esbuild's `binary`
      // loader decodes them with `Buffer`, which browsers do not define, and
      // this module runs while the bundle is imported.
      name: 'wasm-binary',
      setup(build) {
        build.onLoad({ filter: /\.wasm$/ }, async (args) => {
          const base64 = (await readFile(args.path)).toString('base64')
          return {
            contents: `
              const base64 = ${JSON.stringify(base64)}
              const bytes =
                typeof Buffer === 'function'
                  ? new Uint8Array(Buffer.from(base64, 'base64'))
                  : Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
              export default bytes
            `,
            loader: 'js',
          }
        })
      },
    },
    {
      name: 'optimize tailwind',
      setup(build) {
        // Get rid of chalk
        // https://github.com/tailwindlabs/tailwindcss/blob/b8cda161dd0993083dcef1e2a03988c70be0ce93/src/util/log.js
        build.onResolve({ filter: /\/log$/ }, (args) => {
          if (args.importer.includes('/tailwindcss/')) {
            return {
              path: join(__dirname, 'src', 'vendor', 'twrnc', 'log.js'),
            }
          }
        })

        // Get rid of picocolors
        // https://github.com/tailwindlabs/tailwindcss/blob/bf4494104953b13a5f326b250d7028074815e77e/src/featureFlags.js
        build.onResolve({ filter: /^picocolors$/ }, () => {
          return {
            path: join(__dirname, 'src', 'vendor', 'twrnc', 'picocolors.js'),
          }
        })

        // Get rid of util-deprecate/node.js
        build.onResolve({ filter: /util-deprecate/ }, () => {
          return {
            path: join(__dirname, 'src', 'vendor', 'twrnc', 'deprecate.js'),
          }
        })
      },
    },
    // We don't like `Function`.
    // https://github.com/tailwindlabs/tailwindcss/blob/bf4494104953b13a5f326b250d7028074815e77e/src/util/getAllConfigs.js#L8
    replace({
      'preset instanceof Function': 'typeof preset === "function"',
    }),
  ],
})
