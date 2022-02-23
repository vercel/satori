import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('align-justify', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  describe('align-items', () => {
    test('items-start', () => {
      expect(twDefault.processClassName('items-start')).toMatchObject({
        alignItems: 'flex-start'
      })
    })
    test('items-end', () => {
      expect(twDefault.processClassName('items-end')).toMatchObject({
        alignItems: 'flex-end'
      })
    })
    test('items-center', () => {
      expect(twDefault.processClassName('items-center')).toMatchObject({
        alignItems: 'center'
      })
    })
    test('items-baseline', () => {
      expect(twDefault.processClassName('items-baseline')).toMatchObject({
        alignItems: 'baseline'
      })
    })
    test('items-stretch', () => {
      expect(twDefault.processClassName('items-stretch')).toMatchObject({
        alignItems: 'stretch'
      })
    })
  })
  describe('align-items', () => {
    test('items-start', () => {
      expect(twDefault.processClassName('items-start')).toMatchObject({
        alignItems: 'flex-start'
      })
    })
    test('items-end', () => {
      expect(twDefault.processClassName('items-end')).toMatchObject({
        alignItems: 'flex-end'
      })
    })
    test('items-center', () => {
      expect(twDefault.processClassName('items-center')).toMatchObject({
        alignItems: 'center'
      })
    })
    test('items-baseline', () => {
      expect(twDefault.processClassName('items-baseline')).toMatchObject({
        alignItems: 'baseline'
      })
    })
    test('items-stretch', () => {
      expect(twDefault.processClassName('items-stretch')).toMatchObject({
        alignItems: 'stretch'
      })
    })
  })
  describe('align-content', () => {
    test('content-start', () => {
      expect(twDefault.processClassName('content-start')).toMatchObject({
        alignContent: 'flex-start'
      })
    })
    test('content-end', () => {
      expect(twDefault.processClassName('content-end')).toMatchObject({
        alignContent: 'flex-end'
      })
    })
    test('content-center', () => {
      expect(twDefault.processClassName('content-center')).toMatchObject({
        alignContent: 'center'
      })
    })
    test('content-between', () => {
      expect(twDefault.processClassName('content-between')).toMatchObject({
        alignContent: 'space-between'
      })
    })
    test('content-around', () => {
      expect(twDefault.processClassName('content-around')).toMatchObject({
        alignContent: 'space-around'
      })
    })
    test('content-evenly', () => {
      expect(twDefault.processClassName('content-evenly')).toMatchObject({
        alignContent: 'space-evenly'
      })
    })
  })
  describe('align-self', () => {
    test('self-start', () => {
      expect(twDefault.processClassName('self-start')).toMatchObject({
        alignSelf: 'flex-start'
      })
    })
    test('self-end', () => {
      expect(twDefault.processClassName('self-end')).toMatchObject({
        alignSelf: 'flex-end'
      })
    })
    test('self-center', () => {
      expect(twDefault.processClassName('self-center')).toMatchObject({
        alignSelf: 'center'
      })
    })
    test('self-stretch', () => {
      expect(twDefault.processClassName('self-stretch')).toMatchObject({
        alignSelf: 'stretch'
      })
    })
    test('self-auto', () => {
      expect(twDefault.processClassName('self-auto')).toMatchObject({
        alignSelf: 'auto'
      })
    })
    test('self-baseline', () => {
      expect(twDefault.processClassName('self-baseline')).toMatchObject({
        alignSelf: 'baseline'
      })
    })
  })
  describe('justify-content', () => {
    test('justify-start', () => {
      expect(twDefault.processClassName('justify-start')).toMatchObject({
        justifyContent: 'flex-start'
      })
    })
    test('justify-end', () => {
      expect(twDefault.processClassName('justify-end')).toMatchObject({
        justifyContent: 'flex-end'
      })
    })
    test('justify-center', () => {
      expect(twDefault.processClassName('justify-center')).toMatchObject({
        justifyContent: 'center'
      })
    })
    test('justify-between', () => {
      expect(twDefault.processClassName('justify-between')).toMatchObject({
        justifyContent: 'space-between'
      })
    })
    test('justify-around', () => {
      expect(twDefault.processClassName('justify-around')).toMatchObject({
        justifyContent: 'space-around'
      })
    })
    test('justify-evenly', () => {
      expect(twDefault.processClassName('justify-evenly')).toMatchObject({
        justifyContent: 'space-evenly'
      })
    })
  })
})
