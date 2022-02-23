import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('border-radius', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('rounded', () => {
    expect(twDefault.processClassName('rounded')).toMatchObject({
      borderRadius: '0.25rem'
    })
  })
  test('rounded-t', () => {
    expect(twDefault.processClassName('rounded-t-md')).toMatchObject({
      borderTopLeftRadius: '0.375rem',
      borderTopRightRadius: '0.375rem'
    })
  })
  test('rounded-r', () => {
    expect(twDefault.processClassName('rounded-r-none')).toMatchObject({
      borderTopRightRadius: '0px',
      borderBottomRightRadius: '0px'
    })
  })
  test('rounded-b', () => {
    expect(twDefault.processClassName('rounded-b-sm')).toMatchObject({
      borderBottomLeftRadius: '0.125rem',
      borderBottomRightRadius: '0.125rem'
    })
  })
  test('rounded-l', () => {
    expect(twDefault.processClassName('rounded-l-lg')).toMatchObject({
      borderTopLeftRadius: '0.5rem',
      borderBottomLeftRadius: '0.5rem'
    })
  })
  test('rounded-tl', () => {
    expect(twDefault.processClassName('rounded-tl')).toMatchObject({
      borderTopLeftRadius: '0.25rem'
    })
  })
  test('rounded-tr', () => {
    expect(twDefault.processClassName('rounded-tr')).toMatchObject({
      borderTopRightRadius: '0.25rem'
    })
  })
  test('rounded-bl', () => {
    expect(twDefault.processClassName('rounded-bl')).toMatchObject({
      borderBottomLeftRadius: '0.25rem'
    })
  })
  test('rounded-br', () => {
    expect(twDefault.processClassName('rounded-br')).toMatchObject({
      borderBottomRightRadius: '0.25rem'
    })
  })
  describe('Arbitrary values', () => {
    test(`Arbitrary rounded`, () => {
      expect(twDefault.processClassName(`rounded-[99px]`)).toMatchObject({
        borderRadius: '99px'
      })
    })
  })
  describe('Custom config', () => {
    test('Custom borderRadius value', () => {
      const twCustom = createSatoriTailwind({
        theme: { extend: { borderRadius: { DEFAULT: '99px' } } }
      })
      expect(twCustom.processClassName('rounded')).toMatchObject({
        borderRadius: '99px'
      })
    })
  })
})
