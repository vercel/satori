import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('letter-spacing', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('tracking-tighter', () => {
    expect(twDefault.processClassName('tracking-tighter')).toMatchObject({
      letterSpacing: '-0.05em'
    })
  })
  test('tracking-widest', () => {
    expect(twDefault.processClassName('tracking-widest')).toMatchObject({
      letterSpacing: '0.1em'
    })
  })
  describe('Negative values', () => {
    test(`Negative tracking-wide`, () => {
      expect(twDefault.processClassName(`-tracking-wide`)).toMatchObject({
        letterSpacing: '-0.025em'
      })
    })
  })
  describe('Arbitrary values', () => {
    test(`Arbitrary tracking`, () => {
      expect(twDefault.processClassName(`tracking-[.25em]`)).toMatchObject({
        letterSpacing: '.25em'
      })
    })
  })
  describe('Custom config', () => {
    test(`Custom letterSpacing value`, () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { letterSpacing: { bar: '.3em' } } }
      })
      expect(twCustom.processClassName(`tracking-bar`)).toMatchObject({
        letterSpacing: '.3em'
      })
    })
  })
})
