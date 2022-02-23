import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('position', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })

  test('relative', () => {
    expect(twDefault.processClassName('relative')).toMatchObject({
      position: 'relative'
    })
  })

  test('absolute', () => {
    expect(twDefault.processClassName('absolute')).toMatchObject({
      position: 'absolute'
    })
  })
})
