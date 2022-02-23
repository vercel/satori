import { createSatoriTailwind, type SatoriTailwind } from '..'

function testSize([prefix, name]: [string, string]) {
  describe(name, () => {
    let twDefault: SatoriTailwind
    beforeEach(() => {
      twDefault = createSatoriTailwind()
    })

    test(`${prefix}-0`, () => {
      expect(twDefault.processClassName(`${prefix}-0`)).toMatchObject({
        [name]: name === 'maxWidth' ? '0rem' : '0px'
      })
    })
    test(`${prefix}-full`, () => {
      expect(twDefault.processClassName(`${prefix}-full`)).toMatchObject({
        [name]: '100%'
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
      if (name === 'width' || name === 'height') {
        test('Custom spacing value', () => {
          const twCustom = createSatoriTailwind({
            theme: { extend: { spacing: { foo: '1px' } } }
          })
          expect(twCustom.processClassName(`${prefix}-foo`)).toMatchObject({
            [name]: '1px'
          })
        })
      }
      test(`Custom ${name} value`, () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { [name]: { bar: '1px' } } }
        })
        expect(twCustom.processClassName(`${prefix}-bar`)).toMatchObject({
          [name]: '1px'
        })
      })
    })
  })
}

testSize(['w', 'width'])
testSize(['h', 'height'])
testSize(['min-w', 'minWidth'])
testSize(['min-h', 'minHeight'])
testSize(['max-w', 'maxWidth'])
testSize(['max-h', 'maxHeight'])
