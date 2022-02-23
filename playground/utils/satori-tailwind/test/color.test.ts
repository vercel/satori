import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('color', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('text-black', () => {
    expect(twDefault.processClassName('text-black')).toMatchObject({
      color: '#000'
    })
  })
  test('text-sky-900', () => {
    expect(twDefault.processClassName('text-sky-900')).toMatchObject({
      color: '#0c4a6e'
    })
  })
  describe('Arbitrary values', () => {
    test(`Arbitrary color`, () => {
      expect(twDefault.processClassName(`text-[#fff]`)).toMatchObject({
        color: '#fff'
      })
    })
    test(`Arbitrary color with color:`, () => {
      expect(
        twDefault.processClassName(`text-[color:var(--color)]`)
      ).toMatchObject({
        color: 'var(--color)'
      })
    })
  })
  describe('Opacity', () => {
    test(`opacity-10`, () => {
      expect(twDefault.processClassName(`text-sky-900/10`)).toMatchObject({
        color: 'rgb(12 74 110 / 0.1)'
      })
    })
    test(`Arbitrary opacity`, () => {
      expect(twDefault.processClassName(`text-sky-900/[0.67]`)).toMatchObject({
        color: 'rgb(12 74 110 / 0.67)'
      })
    })
  })
  describe('Custom config', () => {
    test('Custom color with a new scale value', () => {
      const twCustom = createSatoriTailwind({
        theme: {
          colors: {
            blue: {
              950: '#17275c'
            }
          }
        }
      })
      expect(twCustom.processClassName(`text-blue-950`)).toMatchObject({
        color: '#17275c'
      })
    })
    test('Custom color with a new name', () => {
      const twCustom = createSatoriTailwind({
        theme: {
          colors: {
            primary: '#5c6ac4'
          }
        }
      })
      expect(twCustom.processClassName(`text-primary`)).toMatchObject({
        color: '#5c6ac4'
      })
    })
  })
})
