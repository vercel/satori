let Yoga: typeof import('yoga-layout')

// @ts-ignore
if (WASM) {
  // For WASM build, we don't include the prebuilt version of Yoga but let the
  // user specify the module manually.
} else {
  Yoga = require('./yoga-prebuilt').default
}

export function init(yoga: typeof Yoga) {
  Yoga = yoga
}

export default function getYoga(): typeof Yoga {
  return Yoga
}
