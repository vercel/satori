import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('border-width', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('border', () => {
    expect(twDefault.processClassName('border-0')).toMatchObject({
      borderWidth: '0px'
    })
  })
  test('border-x', () => {
    expect(twDefault.processClassName('border-x')).toMatchObject({
      borderLeftWidth: '1px',
      borderRightWidth: '1px'
    })
  })
  test('border-y', () => {
    expect(twDefault.processClassName('border-y-2')).toMatchObject({
      borderTopWidth: '2px',
      borderBottomWidth: '2px'
    })
  })
  test('border-top', () => {
    expect(twDefault.processClassName('border-t')).toMatchObject({
      borderTopWidth: '1px'
    })
  })
  test('border-right', () => {
    expect(twDefault.processClassName('border-r-2')).toMatchObject({
      borderRightWidth: '2px'
    })
  })
  test('border-bottom', () => {
    expect(twDefault.processClassName('border-b-4')).toMatchObject({
      borderBottomWidth: '4px'
    })
  })
  test('border-left', () => {
    expect(twDefault.processClassName('border-l-8')).toMatchObject({
      borderLeftWidth: '8px'
    })
  })
  describe('Arbitrary values', () => {
    test('border-99px', () => {
      expect(twDefault.processClassName('border-[99px]')).toMatchObject({
        borderWidth: '99px'
      })
    })
  })
  describe('Custom config', () => {
    test('Custom borderWidth value', () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { borderWidth: { bar: '1px' } } }
      })
      expect(twCustom.processClassName('border-bar')).toMatchObject({
        borderWidth: '1px'
      })
    })
  })
})
