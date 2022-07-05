let Yoga: typeof import('yoga-layout')

import YogaMod from '@yoga'

// @ts-ignore
Yoga = YogaMod.default

export function init(yoga: typeof Yoga) {
  Yoga = yoga
}

export default function getYoga(): typeof Yoga {
  return Yoga
}
