import { readFileSync } from 'node:fs'

// Cloudflare Workers define `WorkerGlobalScope` but not `self.location`, and
// only run WebAssembly modules uploaded with the code: compiling bytes at
// runtime throws. Import `satori/standalone` like that and render once with
// the modules passed to `init`.
const compile = (file) =>
  WebAssembly.compile(readFileSync(new URL(`../${file}`, import.meta.url)))

const layout = await compile('layout.wasm')
const harfbuzz = await compile('harfbuzz.wasm')

const { instantiate } = WebAssembly
const compileError = () =>
  new WebAssembly.CompileError('Wasm code generation disallowed by embedder')
const disallowed = () => Promise.reject(compileError())

globalThis.WorkerGlobalScope = class WorkerGlobalScope {}
globalThis.self = globalThis
WebAssembly.compile = disallowed
WebAssembly.instantiateStreaming = disallowed
WebAssembly.instantiate = (source, imports) =>
  source instanceof WebAssembly.Module
    ? instantiate(source, imports)
    : disallowed()
// Emscripten's `addFunction` compiles a small module synchronously.
WebAssembly.Module = new Proxy(WebAssembly.Module, {
  construct() {
    throw compileError()
  },
})

const { default: satori, init } = await import('../dist/standalone.js')

// Don't wait for `init`: rendering waits for the modules it was given.
init({ layout, harfbuzz })

const svg = await satori(
  { type: 'div', props: { children: 'Hi', style: { display: 'flex' } } },
  {
    width: 100,
    height: 40,
    fonts: [
      {
        name: 'Roboto',
        data: readFileSync(
          new URL('./assets/Roboto-Regular.ttf', import.meta.url)
        ),
        weight: 400,
        style: 'normal',
      },
    ],
  }
)

if (!svg.startsWith('<svg')) {
  throw new Error(`satori/standalone rendered ${svg.slice(0, 100)}`)
}
