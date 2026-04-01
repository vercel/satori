import { defineConfig } from 'tsup';
import { join } from 'path';

const isStandaloneBuild = !!process.env.SATORI_STANDALONE;

export default defineConfig({
	entry: {
		[isStandaloneBuild ? 'standalone' : 'index']: 'src/index.ts',
		'jsx/index': 'src/jsx/index.ts',
		'jsx/jsx-runtime': 'src/jsx/jsx-runtime.ts'
	},
	splitting: false,
	sourcemap: true,
	target: 'node16',
	dts: process.env.NODE_ENV !== 'development' && {
		resolve: ['./types']
	},
	minify: process.env.NODE_ENV !== 'development',
	format: ['esm', 'cjs'],
	noExternal: ['emoji-regex-xs', 'yoga-layout'],
	esbuildOptions(options) {
		options.tsconfig = 'tsconfig.json';
		options.legalComments = 'external';
	},
	// Standalone build: satori bundles everything with zero runtime deps.
	// The consumer provides the WASM binary manually via `init(wasmBinary)`.
	//
	// Two problems with yoga-layout's original files:
	//
	// 1. "yoga-wasm-base64-esm.js" embeds the entire WASM binary as base64
	//    (~120KB). The standalone build doesn't need it since the consumer
	//    provides the WASM via `init()`.
	//
	// 2. "load.js" ignores the `wasmOptions` argument — it calls
	//    `loadYogaImpl()` without passing options through. This breaks the
	//    standalone build's `instantiateWasm` callback (see yoga.external.ts).
	//
	// Solution: at build time, swap the base64 WASM loader with a lightweight
	// one, and patch load.js to pass wasmOptions through to the loader.
	esbuildPlugins: isStandaloneBuild
		? [
				{
					name: 'swap-yoga-standalone',
					setup(build) {
						build.onResolve(
							{ filter: /yoga-wasm-base64-esm/ },
							() => {
								return {
									path: join(
										__dirname,
										'src',
										'vendor',
										'yoga-wasm-esm.js'
									)
								};
							}
						);
						build.onLoad(
							{ filter: /yoga-layout\/dist\/src\/load\.js$/ },
							async args => {
								const { readFile } = await import('fs/promises');
								const contents = await readFile(
									args.path,
									'utf8'
								);
								return {
									contents: contents.replace(
										'loadYogaImpl()',
										'loadYogaImpl(wasmOptions)'
									).replace(
										'async function loadYoga()',
										'async function loadYoga(wasmOptions)'
									),
									loader: 'js'
								};
							}
						);
					}
				}
		  ]
		: [],
	env: isStandaloneBuild
		? {
				SATORI_STANDALONE: '1'
		  }
		: {}
});
