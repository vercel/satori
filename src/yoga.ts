import { type Yoga } from 'yoga-layout/load'
import { type Node } from 'yoga-layout'

export { Yoga as TYoga, Node as YogaNode }

export function init(wasm: ArrayBuffer | Buffer) {
  if (process.env.SATORI_STANDALONE === '1') {
    return import('./yoga.external.js').then((mod) => mod.init(wasm))
  } else {
    // Do nothing. It's bundled.
  }
}

export function getYoga() {
  if (process.env.SATORI_STANDALONE === '1') {
    return import('./yoga.external.js').then((mod) => mod.getYoga())
  } else {
    return import('./yoga.bundled.js').then((mod) => mod.getYoga())
  }
}

if (process.env.SATORI_STANDALONE !== '1') {
  // Preload Yoga in bundled mode.
  import('./yoga.bundled.js')
}
