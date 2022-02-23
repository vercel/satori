import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('cache', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  test('full string', () => {
    expect(twDefault.processClassName('mr-28 mt-28')).toMatchObject({
      marginRight: '7rem',
      marginTop: '7rem'
    })
    expect(twDefault.processClassName('mr-28 mt-28')).toMatchObject({
      marginRight: '7rem',
      marginTop: '7rem'
    })
  })

  test('each class name', () => {
    expect(twDefault.processClassName('mr-32 mt-32')).toMatchObject({
      marginRight: '8rem',
      marginTop: '8rem'
    })
    expect(twDefault.processClassName('mr-32 ml-32')).toMatchObject({
      marginRight: '8rem',
      marginLeft: '8rem'
    })
  })
})
