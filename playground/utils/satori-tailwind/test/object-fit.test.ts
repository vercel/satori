import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('object-fit', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('object-contain', () => {
    expect(twDefault.processClassName('object-contain')).toMatchObject({
      objectFit: 'contain'
    })
  })
  test('object-cover', () => {
    expect(twDefault.processClassName('object-cover')).toMatchObject({
      objectFit: 'cover'
    })
  })
  test('object-none', () => {
    expect(twDefault.processClassName('object-none')).toMatchObject({
      objectFit: 'none'
    })
  })
})
