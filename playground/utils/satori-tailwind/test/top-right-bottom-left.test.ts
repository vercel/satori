import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('top/right/bottom/left', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('inset', () => {
    expect(twDefault.processClassName('inset-0')).toMatchObject({
      top: '0px',
      left: '0px',
      right: '0px',
      bottom: '0px'
    })
  })
  test('inset-x', () => {
    expect(twDefault.processClassName('inset-x-px')).toMatchObject({
      left: '1px',
      right: '1px'
    })
  })
  test('inset-y', () => {
    expect(twDefault.processClassName('inset-y-1/2')).toMatchObject({
      top: '50%',
      bottom: '50%'
    })
  })
  test('top', () => {
    expect(twDefault.processClassName('top-full')).toMatchObject({
      top: '100%'
    })
  })
  test('right', () => {
    expect(twDefault.processClassName('right-3.5')).toMatchObject({
      right: '0.875rem'
    })
  })
  test('bottom', () => {
    expect(twDefault.processClassName('bottom-10')).toMatchObject({
      bottom: '2.5rem'
    })
  })
  test('left', () => {
    expect(twDefault.processClassName('left-auto')).toMatchObject({
      left: 'auto'
    })
  })
  describe('Arbitrary values', () => {
    test(`Arbitrary left`, () => {
      expect(twDefault.processClassName(`left-[99px]`)).toMatchObject({
        left: '99px'
      })
    })
  })
  describe('Negative values', () => {
    test('Negative inset-x', () => {
      expect(twDefault.processClassName('-inset-x-px')).toMatchObject({
        left: '-1px',
        right: '-1px'
      })
    })
  })
  describe('Invalid values', () => {
    test('Invalid values should be ignored', () => {
      expect(twDefault.processClassName('inset-foo')).toMatchObject({})
    })
    test('Negative auto should be ignored', () => {
      expect(twDefault.processClassName('-inset-auto')).toMatchObject({})
    })
  })
  describe('Custom config', () => {
    test('Custom spacing value', () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { spacing: { foo: '1px' } } }
      })
      expect(twCustom.processClassName('left-foo')).toMatchObject({
        left: '1px'
      })
    })
    test('Custom inset value', () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { inset: { bar: '1px' } } }
      })
      expect(twCustom.processClassName('right-bar')).toMatchObject({
        right: '1px'
      })
    })
  })
})
