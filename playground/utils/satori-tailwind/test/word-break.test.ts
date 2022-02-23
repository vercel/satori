import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('word-break', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('break-normal', () => {
    expect(twDefault.processClassName('break-normal')).toMatchObject({
      overflowWrap: 'normal',
      wordBreak: 'normal'
    })
  })
  test('break-all', () => {
    expect(twDefault.processClassName('break-all')).toMatchObject({
      wordBreak: 'break-all'
    })
  })
})
