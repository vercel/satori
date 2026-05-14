import { loadYoga } from 'yoga-layout/load'

// Stash the yoga-loading promise on globalThis so that, if Satori is bundled
// into the consumer twice (e.g. `satori` + `satori/video` shipping side-by-side
// in a serverless function), only one yoga.wasm instantiation runs.
const KEY = Symbol.for('satori.yoga-layout.loadingYoga')
const g = globalThis as Record<symbol, ReturnType<typeof loadYoga> | undefined>
const existed = !!g[KEY]
if (!g[KEY]) g[KEY] = loadYoga()
const loadingYoga = g[KEY]!

console.log('[satori/yoga.bundled] module-load existed=', existed)
loadingYoga.then(
  () => console.log('[satori/yoga.bundled] loadYoga resolved'),
  (err) => console.log('[satori/yoga.bundled] loadYoga rejected', err)
)

export function getYoga() {
  console.log('[satori/yoga.bundled] getYoga called')
  return loadingYoga
}
