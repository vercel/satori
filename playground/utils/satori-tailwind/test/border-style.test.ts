import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('border-style', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('border-solid', () => {
    expect(twDefault.processClassName('border-solid')).toMatchObject({
      borderStyle: 'solid'
    })
  })
  test('border-dashed', () => {
    expect(twDefault.processClassName('border-dashed')).toMatchObject({
      borderStyle: 'dashed'
    })
  })
  test('border-dotted', () => {
    expect(twDefault.processClassName('border-dotted')).toMatchObject({
      borderStyle: 'dotted'
    })
  })
  test('border-double', () => {
    expect(twDefault.processClassName('border-double')).toMatchObject({
      borderStyle: 'double'
    })
  })
  test('border-hidden', () => {
    expect(twDefault.processClassName('border-hidden')).toMatchObject({
      borderStyle: 'hidden'
    })
  })
  test('border-none', () => {
    expect(twDefault.processClassName('border-none')).toMatchObject({
      borderStyle: 'none'
    })
  })
})
