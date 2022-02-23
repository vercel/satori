import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('font-style', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('italic', () => {
    expect(twDefault.processClassName('italic')).toMatchObject({
      fontStyle: 'italic'
    })
  })
  test('not-italic', () => {
    expect(twDefault.processClassName('not-italic')).toMatchObject({
      fontStyle: 'normal'
    })
  })
})
