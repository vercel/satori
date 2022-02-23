import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('background', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  describe('background-color', () => {
    test('bg-black', () => {
      expect(twDefault.processClassName('bg-black')).toMatchObject({
        backgroundColor: '#000'
      })
    })
    test('bg-sky-900', () => {
      expect(twDefault.processClassName('bg-sky-900')).toMatchObject({
        backgroundColor: '#0c4a6e'
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary color`, () => {
        expect(twDefault.processClassName(`bg-[#fff]`)).toMatchObject({
          backgroundColor: '#fff'
        })
      })
      test(`Arbitrary color with color:`, () => {
        expect(
          twDefault.processClassName(`bg-[color:var(--color)]`)
        ).toMatchObject({
          backgroundColor: 'var(--color)'
        })
      })
    })
    describe('Opacity', () => {
      test(`opacity-10`, () => {
        expect(twDefault.processClassName(`bg-sky-900/10`)).toMatchObject({
          backgroundColor: 'rgb(12 74 110 / 0.1)'
        })
      })
      test(`Arbitrary opacity`, () => {
        expect(twDefault.processClassName(`bg-sky-900/[0.67]`)).toMatchObject({
          backgroundColor: 'rgb(12 74 110 / 0.67)'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom background color with a new scale value', () => {
        const twCustom = createSatoriTailwind({
          theme: {
            colors: {
              blue: {
                950: '#17275c'
              }
            }
          }
        })
        expect(twCustom.processClassName(`bg-blue-950`)).toMatchObject({
          backgroundColor: '#17275c'
        })
      })
      test('Custom background color with a new name', () => {
        const twCustom = createSatoriTailwind({
          theme: {
            colors: {
              primary: '#5c6ac4'
            }
          }
        })
        expect(twCustom.processClassName(`bg-primary`)).toMatchObject({
          backgroundColor: '#5c6ac4'
        })
      })
    })
  })
  describe('background-position', () => {
    test('bg-bottom', () => {
      expect(twDefault.processClassName('bg-bottom')).toMatchObject({
        backgroundPosition: 'bottom'
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary background position`, () => {
        expect(
          twDefault.processClassName(`bg-[center_top_1rem]`)
        ).toMatchObject({
          backgroundPosition: 'center top 1rem'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom background position', () => {
        const twCustom = createSatoriTailwind({
          theme: {
            backgroundPosition: {
              'bottom-4': 'center bottom 1rem'
            }
          }
        })
        expect(twCustom.processClassName(`bg-bottom-4`)).toMatchObject({
          backgroundPosition: 'center bottom 1rem'
        })
      })
    })
  })
  describe('background-size', () => {
    test('bg-cover', () => {
      expect(twDefault.processClassName('bg-cover')).toMatchObject({
        backgroundSize: 'cover'
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary background`, () => {
        expect(
          twDefault.processClassName(`bg-[length:200px_100px]`)
        ).toMatchObject({
          backgroundSize: '200px 100px'
        })
      })
    })
    describe('Custom config', () => {
      test('Custom background position', () => {
        const twCustom = createSatoriTailwind({
          theme: {
            backgroundSize: {
              '50%': '50%'
            }
          }
        })
        expect(twCustom.processClassName(`bg-50%`)).toMatchObject({
          backgroundSize: '50%'
        })
      })
    })
  })
  describe('background-image', () => {
    test('bg-none', () => {
      expect(twDefault.processClassName('bg-none')).toMatchObject({
        backgroundImage: 'none'
      })
    })
    describe('gradient', () => {
      test(`gradient-to-r with from and to`, () => {
        expect(
          twDefault.processClassName(
            `bg-gradient-to-r from-cyan-500 to-blue-500`
          )
        ).toMatchObject({
          backgroundImage: 'linear-gradient(to right, #06b6d4, #3b82f6)'
        })
      })
      test(`gradient-to-r with from only`, () => {
        expect(
          twDefault.processClassName(`bg-gradient-to-r from-cyan-500`)
        ).toMatchObject({
          backgroundImage:
            'linear-gradient(to right, #06b6d4, rgb(6 182 212 / 0))'
        })
      })
      test(`gradient-to-r with from and via`, () => {
        expect(
          twDefault.processClassName(
            `bg-gradient-to-r from-cyan-500 via-blue-500`
          )
        ).toMatchObject({
          backgroundImage:
            'linear-gradient(to right, #06b6d4, #3b82f6, rgb(59 130 246 / 0))'
        })
      })
      test(`gradient-to-r with from, via, and to`, () => {
        expect(
          twDefault.processClassName(
            `bg-gradient-to-r from-cyan-500 via-blue-500  to-indigo-500`
          )
        ).toMatchObject({
          backgroundImage:
            'linear-gradient(to right, #06b6d4, #3b82f6, #6366f1)'
        })
      })
      describe('Arbitrary values', () => {
        test(`Arbitrary background`, () => {
          expect(
            twDefault.processClassName(
              `bg-gradient-to-r from-[#243c5a] to-blue-500`
            )
          ).toMatchObject({
            backgroundImage: 'linear-gradient(to right, #243c5a, #3b82f6)'
          })
        })
      })
      describe('Custom config', () => {
        test('Custom background position', () => {
          const twCustom = createSatoriTailwind({
            theme: {
              colors: {
                foo: '#243c5a',
                bar: '#3b82f6'
              }
            }
          })
          expect(
            twCustom.processClassName(`bg-gradient-to-r from-foo to-bar`)
          ).toMatchObject({
            backgroundImage: 'linear-gradient(to right, #243c5a, #3b82f6)'
          })
        })
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary background`, () => {
        expect(
          twDefault.processClassName(`bg-[url('/img/hero-pattern.svg')]`)
        ).toMatchObject({
          backgroundImage: "url('/img/hero-pattern.svg')"
        })
      })
    })
    describe('Custom config', () => {
      test('Custom background position', () => {
        const twCustom = createSatoriTailwind({
          theme: {
            backgroundImage: {
              'hero-pattern': "url('/img/hero-pattern.svg')"
            }
          }
        })
        expect(twCustom.processClassName(`bg-hero-pattern`)).toMatchObject({
          backgroundImage: "url('/img/hero-pattern.svg')"
        })
      })
    })
  })
})
