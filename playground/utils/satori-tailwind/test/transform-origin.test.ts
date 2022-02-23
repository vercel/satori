import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('transform-origin', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('origin-center', () => {
    expect(twDefault.processClassName('origin-center')).toMatchObject({
      transformOrigin: 'center'
    })
  })
  test('origin-bottom-left', () => {
    expect(twDefault.processClassName('origin-bottom-left')).toMatchObject({
      transformOrigin: 'bottom left'
    })
  })
  describe('Arbitrary values', () => {
    test('Arbitrary origin value', () => {
      expect(twDefault.processClassName('origin-[33%_75%]')).toMatchObject({
        transformOrigin: '33% 75%'
      })
    })
  })
  describe('Custom config', () => {
    test('Custom transformOrigin value', () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { transformOrigin: { bar: '33% 75%' } } }
      })
      expect(twCustom.processClassName('origin-bar')).toMatchObject({
        transformOrigin: '33% 75%'
      })
    })
  })
})
