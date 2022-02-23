import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('display', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })

  test('hidden', () => {
    expect(twDefault.processClassName('hidden')).toMatchObject({
      display: 'none'
    })
  })

  test('flex', () => {
    expect(twDefault.processClassName('flex')).toMatchObject({
      display: 'flex'
    })
  })
})
