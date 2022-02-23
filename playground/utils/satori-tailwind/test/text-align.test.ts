import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('text-align', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('text-left', () => {
    expect(twDefault.processClassName('text-left')).toMatchObject({
      textAlign: 'left'
    })
  })
  test('text-center', () => {
    expect(twDefault.processClassName('text-center')).toMatchObject({
      textAlign: 'center'
    })
  })
  test('text-right', () => {
    expect(twDefault.processClassName('text-right')).toMatchObject({
      textAlign: 'right'
    })
  })
  test('text-justify', () => {
    expect(twDefault.processClassName('text-justify')).toMatchObject({
      textAlign: 'justify'
    })
  })
})
