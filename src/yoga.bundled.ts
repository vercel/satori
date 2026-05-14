import { loadYoga } from 'yoga-layout/load'

// Stash the yoga-loading promise on globalThis so that, if Satori is bundled
// into the consumer twice (e.g. `satori` + `satori/video` shipping side-by-side
// in a serverless function), only one yoga.wasm instantiation runs.
const KEY = Symbol.for('satori.yoga-layout.loadingYoga')
const g = globalThis as Record<symbol, ReturnType<typeof loadYoga> | undefined>
if (!g[KEY]) g[KEY] = loadYoga()
const loadingYoga = g[KEY]!

export function getYoga() {
  return loadingYoga
}
