import { createSatoriTailwind, type SatoriTailwind } from '..'

describe('flex', () => {
  let twDefault: SatoriTailwind
  beforeEach(() => {
    twDefault = createSatoriTailwind()
  })
  describe('flex-direction', () => {
    test('flex-row', () => {
      expect(twDefault.processClassName('flex-row')).toMatchObject({
        flexDirection: 'row'
      })
    })
    test('flex-col', () => {
      expect(twDefault.processClassName('flex-col')).toMatchObject({
        flexDirection: 'column'
      })
    })
    test('flex-row-reverse', () => {
      expect(twDefault.processClassName('flex-row-reverse')).toMatchObject({
        flexDirection: 'row-reverse'
      })
    })
    test('flex-col-reverse', () => {
      expect(twDefault.processClassName('flex-col-reverse')).toMatchObject({
        flexDirection: 'column-reverse'
      })
    })
  })
  describe('flex-wrap', () => {
    test('flex-wrap', () => {
      expect(twDefault.processClassName('flex-wrap')).toMatchObject({
        flexWrap: 'wrap'
      })
    })
    test('flex-wrap-reverse', () => {
      expect(twDefault.processClassName('flex-wrap-reverse')).toMatchObject({
        flexWrap: 'wrap-reverse'
      })
    })
    test('flex-nowrap', () => {
      expect(twDefault.processClassName('flex-nowrap')).toMatchObject({
        flexWrap: 'nowrap'
      })
    })
  })
  describe('flex-grow', () => {
    test('grow', () => {
      expect(twDefault.processClassName('grow')).toMatchObject({
        flexGrow: '1'
      })
    })
    test('grow-0', () => {
      expect(twDefault.processClassName('grow-0')).toMatchObject({
        flexGrow: '0'
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary grow`, () => {
        expect(twDefault.processClassName(`grow-[2]`)).toMatchObject({
          flexGrow: '2'
        })
      })
    })
    describe('Custom config', () => {
      test(`Custom flexGrow value`, () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { flexGrow: { bar: '100' } } }
        })
        expect(twCustom.processClassName(`grow-bar`)).toMatchObject({
          flexGrow: '100'
        })
      })
    })
  })
  describe('flex-shrink', () => {
    test('shrink', () => {
      expect(twDefault.processClassName('shrink')).toMatchObject({
        flexShrink: '1'
      })
    })
    test('shrink-0', () => {
      expect(twDefault.processClassName('shrink-0')).toMatchObject({
        flexShrink: '0'
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary shrink`, () => {
        expect(twDefault.processClassName(`shrink-[2]`)).toMatchObject({
          flexShrink: '2'
        })
      })
    })
    describe('Custom config', () => {
      test(`Custom flexShrink value`, () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { flexShrink: { bar: '100' } } }
        })
        expect(twCustom.processClassName(`shrink-bar`)).toMatchObject({
          flexShrink: '100'
        })
      })
    })
  })
  describe('flex-basis', () => {
    test('basis-1', () => {
      expect(twDefault.processClassName('basis-1')).toMatchObject({
        flexBasis: '0.25rem'
      })
    })
    test('basis-full', () => {
      expect(twDefault.processClassName('basis-full')).toMatchObject({
        flexBasis: '100%'
      })
    })
    describe('Arbitrary values', () => {
      test(`Arbitrary basis`, () => {
        expect(twDefault.processClassName(`basis-[1rem]`)).toMatchObject({
          flexBasis: '1rem'
        })
      })
    })
    describe('Custom config', () => {
      test(`Custom flexBasis value`, () => {
        const twCustom = createSatoriTailwind({
          theme: { extend: { flexBasis: { bar: '1rem' } } }
        })
        expect(twCustom.processClassName(`basis-bar`)).toMatchObject({
          flexBasis: '1rem'
        })
      })
    })
  })
})
