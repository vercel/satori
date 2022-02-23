import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('border-color', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('border-black', () => {
    expect(twDefault.processClassName('border-black')).toMatchObject({
      borderColor: '#000'
    })
  })
  test('border-x-sky-900', () => {
    expect(twDefault.processClassName('border-x-sky-900')).toMatchObject({
      borderLeftColor: '#0c4a6e',
      borderRightColor: '#0c4a6e'
    })
  })
  test('border-y-green-900', () => {
    expect(twDefault.processClassName('border-y-green-900')).toMatchObject({
      borderTopColor: '#14532d',
      borderBottomColor: '#14532d'
    })
  })
  test('border-t-rose-900', () => {
    expect(twDefault.processClassName('border-t-rose-900')).toMatchObject({
      borderTopColor: '#881337'
    })
  })
  test('border-b-yellow-900', () => {
    expect(twDefault.processClassName('border-b-yellow-900')).toMatchObject({
      borderBottomColor: '#713f12'
    })
  })
  test('border-l-lime-900', () => {
    expect(twDefault.processClassName('border-l-lime-900')).toMatchObject({
      borderLeftColor: '#365314'
    })
  })
  test('border-r-teal-900', () => {
    expect(twDefault.processClassName('border-r-teal-900')).toMatchObject({
      borderRightColor: '#134e4a'
    })
  })
  describe('Arbitrary values', () => {
    test(`Arbitrary border color`, () => {
      expect(twDefault.processClassName(`border-[#fff]`)).toMatchObject({
        borderColor: '#fff'
      })
    })
    test(`Arbitrary border color with color:`, () => {
      expect(
        twDefault.processClassName(`border-[color:var(--color)]`)
      ).toMatchObject({
        borderColor: 'var(--color)'
      })
    })
  })
  describe('Opacity', () => {
    test(`opacity-10`, () => {
      expect(twDefault.processClassName(`border-sky-900/10`)).toMatchObject({
        borderColor: 'rgb(12 74 110 / 0.1)'
      })
    })
    test(`Arbitrary opacity`, () => {
      expect(
        twDefault.processClassName(`border-y-sky-900/[0.67]`)
      ).toMatchObject({
        borderTopColor: 'rgb(12 74 110 / 0.67)',
        borderBottomColor: 'rgb(12 74 110 / 0.67)'
      })
    })
  })
  describe('Custom config', () => {
    test('Custom border color with a new scale value', () => {
      const twCustom = createSatoriTailwind({
        theme: {
          colors: {
            blue: {
              950: '#17275c'
            }
          }
        }
      })
      expect(twCustom.processClassName(`border-blue-950`)).toMatchObject({
        borderColor: '#17275c'
      })
    })
    test('Custom border color with a new name', () => {
      const twCustom = createSatoriTailwind({
        theme: {
          colors: {
            primary: '#5c6ac4'
          }
        }
      })
      expect(twCustom.processClassName(`border-x-primary`)).toMatchObject({
        borderLeftColor: '#5c6ac4',
        borderRightColor: '#5c6ac4'
      })
    })
  })
})
