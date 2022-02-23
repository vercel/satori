import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('text-transform', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('uppercase', () => {
    expect(twDefault.processClassName('uppercase')).toMatchObject({
      textTransform: 'uppercase'
    })
  })
  test('lowercase', () => {
    expect(twDefault.processClassName('lowercase')).toMatchObject({
      textTransform: 'lowercase'
    })
  })
  test('capitalize', () => {
    expect(twDefault.processClassName('capitalize')).toMatchObject({
      textTransform: 'capitalize'
    })
  })
  test('normal-case', () => {
    expect(twDefault.processClassName('normal-case')).toMatchObject({
      textTransform: 'none'
    })
  })
})
