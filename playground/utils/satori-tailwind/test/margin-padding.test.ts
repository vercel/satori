import { createSatoriTailwind, type SatoriTailwind } from '..'

function testMarginPadding([prefix, name]: [string, string]) {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  describe(name, () => {
    test(`${prefix}`, () => {
      expect(twDefault.processClassName(`${prefix}-0`)).toMatchObject({
        [name]: '0px'
      })
    })
    test(`${prefix}x`, () => {
      expect(twDefault.processClassName(`${prefix}x-px`)).toMatchObject({
        [`${name}Left`]: '1px',
        [`${name}Right`]: '1px'
      })
    })
    test(`${prefix}y`, () => {
      expect(twDefault.processClassName(`${prefix}y-1`)).toMatchObject({
        [`${name}Top`]: '0.25rem',
        [`${name}Bottom`]: '0.25rem'
      })
    })
    test(`${prefix}t`, () => {
      expect(twDefault.processClassName(`${prefix}t-2`)).toMatchObject({
        [`${name}Top`]: '0.5rem'
      })
    })
    test(`${prefix}r`, () => {
      expect(twDefault.processClassName(`${prefix}r-10`)).toMatchObject({
        [`${name}Right`]: '2.5rem'
      })
    })
    test(`${prefix}b`, () => {
      expect(twDefault.processClassName(`${prefix}b-3.5`)).toMatchObject({
        [`${name}Bottom`]: '0.875rem'
      })
    })
    test(`${prefix}l`, () => {
      expect(twDefault.processClassName(`${prefix}l-16`)).toMatchObject({
        [`${name}Left`]: '4rem'
      })
    })
    describe('Negative values', () => {
      test(`Negative ${prefix}x`, () => {
        expect(twDefault.processClassName(`-${prefix}x-px`)).toMatchObject({
          [`${name}Left`]: '-1px',
          [`${name}Right`]: '-1px'
        })
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary ${prefix}`, () => {
        expect(twDefault.processClassName(`${prefix}-[99px]`)).toMatchObject({
          [name]: '99px'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom spacing value', () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { spacing: { foo: '1px' } } }
        })
        expect(twCustom.processClassName(`${prefix}l-foo`)).toMatchObject({
          [`${name}Left`]: '1px'
        })
      })
      test(`Custom ${name} value`, () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { [name]: { bar: '1px' } } }
        })
        expect(twCustom.processClassName(`${prefix}r-bar`)).toMatchObject({
          [`${name}Right`]: '1px'
        })
      })
    })
  })
}

testMarginPadding(['m', 'margin'])
testMarginPadding(['p', 'padding'])
