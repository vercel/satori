let Yoga: typeof import('yoga-layout')

export function init(yoga: typeof Yoga) {
  Yoga = yoga
}

export default async function getYoga(): Promise<typeof Yoga> {
  if (!Yoga) {
    const mod = await import('@yoga')
    // @ts-expect-error Yoga type is wrong
    Yoga = mod.getYoga();
  }
  return Yoga
}
