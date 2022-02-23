import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('transform', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  describe('scale', () => {
    test('scale', () => {
      expect(twDefault.processClassName('scale-50')).toMatchObject({
        transform: 'scale(.5)'
      })
    })
    test('scale-x', () => {
      expect(twDefault.processClassName('scale-x-100')).toMatchObject({
        transform: 'scaleX(1)'
      })
    })
    test('scale-y', () => {
      expect(twDefault.processClassName('scale-y-150')).toMatchObject({
        transform: 'scaleY(1.5)'
      })
    })
    describe('Arbitrary values', () => {
      test('scale-[1.7]', () => {
        expect(twDefault.processClassName('scale-[1.7]')).toMatchObject({
          transform: 'scale(1.7)'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom scale value', () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { scale: { bar: '1.75' } } }
        })
        expect(twCustom.processClassName('scale-bar')).toMatchObject({
          transform: 'scale(1.75)'
        })
      })
    })
  })
  describe('rotate', () => {
    test('rotate', () => {
      expect(twDefault.processClassName('rotate-1')).toMatchObject({
        transform: 'rotate(1deg)'
      })
    })
    describe('Negative values', () => {
      test('-rotate-1', () => {
        expect(twDefault.processClassName('-rotate-1')).toMatchObject({
          transform: 'rotate(-1deg)'
        })
      })
    })
    describe('Arbitrary values', () => {
      test('Arbitrary rotate value', () => {
        expect(twDefault.processClassName('rotate-[17deg]')).toMatchObject({
          transform: 'rotate(17deg)'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom rotate value', () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { rotate: { bar: '17deg' } } }
        })
        expect(twCustom.processClassName('rotate-bar')).toMatchObject({
          transform: 'rotate(17deg)'
        })
      })
    })
  })
  describe('translate', () => {
    test('translate-x', () => {
      expect(twDefault.processClassName('translate-x-px')).toMatchObject({
        transform: 'translateX(1px)'
      })
    })
    test('translate-y', () => {
      expect(twDefault.processClassName('translate-y-px')).toMatchObject({
        transform: 'translateY(1px)'
      })
    })
    describe('Negative values', () => {
      test('-translate-x', () => {
        expect(twDefault.processClassName('-translate-x-px')).toMatchObject({
          transform: 'translateX(-1px)'
        })
      })
    })
    describe('Arbitrary values', () => {
      test('Arbitrary translate value', () => {
        expect(twDefault.processClassName('translate-x-[17rem]')).toMatchObject(
          {
            transform: 'translateX(17rem)'
          }
        )
      })
    })
    describe('Custom config', () => {
      test('Custom translate value', () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { translate: { bar: '17rem' } } }
        })
        expect(twCustom.processClassName('translate-x-bar')).toMatchObject({
          transform: 'translateX(17rem)'
        })
      })
    })
  })
  describe('skew', () => {
    test('skew-x', () => {
      expect(twDefault.processClassName('skew-x-1')).toMatchObject({
        transform: 'skewX(1deg)'
      })
    })
    test('skew-y', () => {
      expect(twDefault.processClassName('skew-y-1')).toMatchObject({
        transform: 'skewY(1deg)'
      })
    })
    describe('Negative values', () => {
      test('-skew-x', () => {
        expect(twDefault.processClassName('-skew-x-1')).toMatchObject({
          transform: 'skewX(-1deg)'
        })
      })
    })
    describe('Arbitrary values', () => {
      test('Arbitrary skew value', () => {
        expect(twDefault.processClassName('skew-x-[17deg]')).toMatchObject({
          transform: 'skewX(17deg)'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom skew value', () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { skew: { bar: '17deg' } } }
        })
        expect(twCustom.processClassName('skew-x-bar')).toMatchObject({
          transform: 'skewX(17deg)'
        })
      })
    })
  })
  describe('Multiple transforms', () => {
    test('scale-x rotate skew-x translate-x', () => {
      expect(
        twDefault.processClassName(
          'scale-x-100 rotate-1 skew-x-1 translate-x-px'
        )
      ).toMatchObject({
        transform: 'scaleX(1) rotate(1deg) skewX(1deg) translateX(1px)'
      })
    })
  })
})
