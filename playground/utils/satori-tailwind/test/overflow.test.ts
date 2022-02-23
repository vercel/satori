import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('overflow', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  describe('overflow', () => {
    test('overflow-hidden', () => {
      expect(twDefault.processClassName('overflow-hidden')).toMatchObject({
        overflow: 'hidden'
      })
    })
    test('overflow-visible', () => {
      expect(twDefault.processClassName('overflow-visible')).toMatchObject({
        overflow: 'visible'
      })
    })
  })
  describe('overflow-x', () => {
    test('overflow-x-hidden', () => {
      expect(twDefault.processClassName('overflow-x-hidden')).toMatchObject({
        overflowX: 'hidden'
      })
    })
    test('overflow-x-visible', () => {
      expect(twDefault.processClassName('overflow-x-visible')).toMatchObject({
        overflowX: 'visible'
      })
    })
  })
  describe('overflow-y', () => {
    test('overflow-y-hidden', () => {
      expect(twDefault.processClassName('overflow-y-hidden')).toMatchObject({
        overflowY: 'hidden'
      })
    })
    test('overflow-y-visible', () => {
      expect(twDefault.processClassName('overflow-y-visible')).toMatchObject({
        overflowY: 'visible'
      })
    })
  })
})
