import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('font-size', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('text-xs', () => {
    expect(twDefault.processClassName('text-xs')).toMatchObject({
      fontSize: '0.75rem',
      lineHeight: '1rem'
    })
  })
  test('text-9xl', () => {
    expect(twDefault.processClassName('text-9xl')).toMatchObject({
      fontSize: '8rem',
      lineHeight: '1'
    })
  })
  describe('Arbitrary values', () => {
    test(`Arbitrary font-size`, () => {
      expect(twDefault.processClassName(`text-[100px]`)).toMatchObject({
        fontSize: '100px'
      })
    })
    test(`Arbitrary font-size with length:`, () => {
      expect(
        twDefault.processClassName(`text-[length:var(--length)]`)
      ).toMatchObject({
        fontSize: 'var(--length)'
      })
    })
  })
  describe('Custom config', () => {
    test('Custom fontSize value with a single value', () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { fontSize: { foo: '18px' } } }
      })
      expect(twCustom.processClassName(`text-foo`)).toMatchObject({
        fontSize: '18px'
      })
    })
    test('Custom fontSize value with array', () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { fontSize: { foo: ['30px', '40px'] } } }
      })
      expect(twCustom.processClassName(`text-foo`)).toMatchObject({
        fontSize: '30px',
        lineHeight: '40px'
      })
    })
    test('Custom fontSize value with object', () => {
      const twCustom = createSatoriTailwind({
        theme: {
          extend: {
            fontSize: {
              foo: [
                '14px',
                {
                  lineHeight: '20px'
                }
              ]
            }
          }
        }
      })
      expect(twCustom.processClassName(`text-foo`)).toMatchObject({
        fontSize: '14px',
        lineHeight: '20px'
      })
    })
  })
})
