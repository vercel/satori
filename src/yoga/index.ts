import type { Yoga } from 'yoga-wasm-web'

let yogaInstance: Yoga

export function init(yoga: Yoga) {
  yogaInstance = yoga
}

let initializationPromise = null

export default async function getYoga(): Promise<Yoga> {
  if (yogaInstance) return yogaInstance

  if (initializationPromise) {
    await initializationPromise
    return yogaInstance
  }

  initializationPromise = import('@yoga')
    .then((mod) => mod.getYogaModule())
    .then((yoga) => (yogaInstance = yoga))

  await initializationPromise
  initializationPromise = null

  return yogaInstance
}
