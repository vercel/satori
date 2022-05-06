let Yoga: any

// @ts-ignore
Yoga = YogaMod.default

export function initYoga(yoga: typeof Yoga) {
  Yoga = yoga
}

export default function getYoga(): typeof Yoga {
  return Yoga
}
