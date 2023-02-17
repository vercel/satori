let Yoga: typeof import('yoga-layout')

export function init(yoga: typeof Yoga) {
  Yoga = yoga
}

let initializationPromise = null

export default async function getYoga(): Promise<typeof Yoga> {
  if (Yoga) return Yoga

  if (initializationPromise) {
    await initializationPromise
    return Yoga
  }

  initializationPromise = import('@yoga')
    .then((mod) => mod.getYogaModule())
    .then((yogaInstance) => (Yoga = yogaInstance))

  await initializationPromise
  initializationPromise = null

  return Yoga
}
