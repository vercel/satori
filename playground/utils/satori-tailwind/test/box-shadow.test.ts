import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('box-shadow', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  describe('shadow', () => {
    test('shadow', () => {
      expect(twDefault.processClassName('shadow')).toMatchObject({
        boxShadow:
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
      })
    })
    test('shadow-2xl', () => {
      expect(twDefault.processClassName('shadow-2xl')).toMatchObject({
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary shadow`, () => {
        expect(
          twDefault.processClassName(
            `shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)]`
          )
        ).toMatchObject({
          boxShadow: '0 35px 60px -15px rgba(0,0,0,0.3)'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom shadow', () => {
        const twCustom = createSatoriTailwind({
          theme: {
            boxShadow: {
              '3xl': '0 35px 60px -15px rgba(0, 0, 0, 0.3)'
            }
          }
        })
        expect(twCustom.processClassName(`shadow-3xl`)).toMatchObject({
          boxShadow: '0 35px 60px -15px rgba(0, 0, 0, 0.3)'
        })
      })
    })
  })
  describe('shadow color', () => {
    test('shadow shadow-slate-50', () => {
      expect(
        twDefault.processClassName('shadow shadow-slate-50')
      ).toMatchObject({
        boxShadow: '0 1px 3px 0 #f8fafc, 0 1px 2px -1px #f8fafc'
      })
    })
    describe('Opacity', () => {
      test('shadow shadow-cyan-500/50', () => {
        expect(
          twDefault.processClassName('shadow shadow-cyan-500/50')
        ).toMatchObject({
          boxShadow:
            '0 1px 3px 0 rgb(6 182 212 / 0.5), 0 1px 2px -1px rgb(6 182 212 / 0.5)'
        })
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary shadow`, () => {
        expect(
          twDefault.processClassName(`shadow shadow-[#50d71e]`)
        ).toMatchObject({
          boxShadow: '0 1px 3px 0 #50d71e, 0 1px 2px -1px #50d71e'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom shadow', () => {
        const twCustom = createSatoriTailwind({
          theme: {
            colors: {
              bar: '#243c5a'
            }
          }
        })
        expect(twCustom.processClassName(`shadow shadow-bar`)).toMatchObject({
          boxShadow: '0 1px 3px 0 #243c5a, 0 1px 2px -1px #243c5a'
        })
      })
    })
  })
})
