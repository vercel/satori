/**
 * This configuration ensures that the prebuilt Yoga (asm.js) is not included in
 * the WASM bundle.
 */

import { defineConfig } from 'tsup'
import { join } from 'path'
import { replace } from 'esbuild-plugin-replace'
import { readFile } from 'node:fs/promises'

export default defineConfig({
  entry: ['src/index.ts'],
  splitting: false,
  sourcemap: true,
  target: 'node16',
  dts: process.env.NODE_ENV !== 'development' && {
    resolve: ['twrnc', './tw-config', './types'],
  },
  minify: process.env.NODE_ENV !== 'development',
  format: ['esm', 'cjs'],
  noExternal: ['twrnc', 'emoji-regex'],
  esbuildOptions(options) {
    if (process.env.WASM) {
      options.outExtension = {
        '.js': `.wasm.${options.format === 'cjs' ? 'cjs' : 'js'}`,
      }
    }
    options.tsconfig = process.env.WASM ? 'tsconfig.wasm.json' : 'tsconfig.json'
    options.legalComments = 'external'
  },
  esbuildPlugins: [
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

        build.onLoad({ filter: /hb.wasm$/ }, async (args) => {
          const wasm = await readFile(args.path)

          const contents = Buffer.from(wasm, 'binary').toString('base64')

          return {
            contents,
            loader: 'text',
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

function asciiToBinary(str) {
  if (typeof atob === 'function') {
    // this works in the browser
    return atob(str)
  } else {
    // this works in node
    return new Buffer(str, 'base64').toString('binary')
  }
}

function decode(encoded: string): ArrayBuffer {
  const binaryString = asciiToBinary(encoded)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}
