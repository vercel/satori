import { type Yoga } from 'yoga-layout/load'
import { type Node } from 'yoga-layout'
import { type InitInput } from './yoga.external.js'

export { Yoga as TYoga, Node as YogaNode, type InitInput }

// Unique per module-instance so two bundled copies log distinguishably.
const BUILD_MARK =
  '[yoga.ts id=' +
  Math.random().toString(36).slice(2, 8) +
  ' standalone=' +
  String(process.env.SATORI_STANDALONE) +
  ']'
console.log(BUILD_MARK + ' module-load')

let bundledYogaPromise: Promise<Yoga> | undefined

function getBundledYoga() {
  if (!bundledYogaPromise) {
    console.log(BUILD_MARK + ' importing yoga.bundled')
    const bundledYogaModulePromise = import('./yoga.bundled.js')
    bundledYogaModulePromise.then(
      () => console.log(BUILD_MARK + ' yoga.bundled import resolved'),
      (err) => console.log(BUILD_MARK + ' yoga.bundled import rejected', err)
    )
    bundledYogaPromise = bundledYogaModulePromise.then((mod) => mod.getYoga())
    bundledYogaPromise.then(
      () => console.log(BUILD_MARK + ' yoga resolved'),
      (err) => console.log(BUILD_MARK + ' yoga rejected', err)
    )
  } else {
    console.log(BUILD_MARK + ' reusing yoga promise')
  }
  return bundledYogaPromise
}

export function init(input: InitInput) {
  if (process.env.SATORI_STANDALONE === '1') {
    return import('./yoga.external.js').then((mod) => mod.init(input))
  } else {
    // Do nothing. It's bundled.
  }
}

export function getYoga() {
  console.log(BUILD_MARK + ' getYoga called')
  if (process.env.SATORI_STANDALONE === '1') {
    return import('./yoga.external.js').then((mod) => mod.getYoga())
  } else {
    return getBundledYoga()
  }
}

if (process.env.SATORI_STANDALONE !== '1') {
  console.log(BUILD_MARK + ' kicking off preload')
  // Preload Yoga in bundled mode.
  getBundledYoga()
}
