import { loadYoga, type Yoga } from 'yoga-layout/load'

let resolveYoga: (yoga: Yoga) => void
const yogaPromise: Promise<Yoga> = new Promise((resolve) => {
  resolveYoga = resolve
})

export function init(yogaWasm: ArrayBuffer | Buffer) {
  // Not properly typed.
  ;(loadYoga as any)(yogaWasm).then(resolveYoga)
}

export function getYoga() {
  return yogaPromise
}
