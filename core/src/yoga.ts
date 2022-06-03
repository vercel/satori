let Yoga: any

export function initYoga(yoga: typeof Yoga) {
  Yoga = yoga
}

export default function getYoga(): typeof Yoga {
  return Yoga
}
