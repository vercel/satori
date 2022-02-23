import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('opacity', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('opacity-50', () => {
    expect(twDefault.processClassName('opacity-50')).toMatchObject({
      opacity: '0.5'
    })
  })
  test('opacity-0', () => {
    expect(twDefault.processClassName('opacity-0')).toMatchObject({
      opacity: '0'
    })
  })
  describe('Arbitrary values', () => {
    test(`Arbitrary opacity`, () => {
      expect(twDefault.processClassName(`opacity-[.99]`)).toMatchObject({
        opacity: '.99'
      })
    })
  })
  describe('Custom config', () => {
    test(`Custom opacity value`, () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { opacity: { bar: '.88' } } }
      })
      expect(twCustom.processClassName(`opacity-bar`)).toMatchObject({
        opacity: '.88'
      })
    })
  })
})
