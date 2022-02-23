import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('font-family', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('font-sans', () => {
    expect(twDefault.processClassName('font-sans')).toMatchObject({
      fontFamily:
        'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
    })
  })
  test('font-serif', () => {
    expect(twDefault.processClassName('font-serif')).toMatchObject({
      fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
    })
  })
  test('font-mono', () => {
    expect(twDefault.processClassName('font-mono')).toMatchObject({
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    })
  })
  describe('Arbitrary values', () => {
    test(`Arbitrary font-family`, () => {
      expect(twDefault.processClassName(`font-[Open_Sans]`)).toMatchObject({
        fontFamily: 'Open Sans'
      })
    })
  })
  describe('Custom config', () => {
    test('Custom fontFamily value', () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { fontFamily: { sans: ['Inter'] } } }
      })
      expect(twCustom.processClassName(`font-sans`)).toMatchObject({
        fontFamily: 'Inter'
      })
    })
  })
})
