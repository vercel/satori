import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Shadow', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('box-shadow', () => {
    it('should render regular box shadow', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            background: 'white',
            boxShadow: '0 0 10px green',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render box shadow with offset', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            background: 'white',
            boxShadow: '10px -20px 10px red',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render box shadow with offset and spread', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            background: 'white',
            boxShadow: '10px -10px 10px 10px red',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render multiple box shadows', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            background: 'white',
            boxShadow: '10px -10px 10px 10px red, -10px -10px 10px 10px blue',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support negative spread', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            background: 'white',
            borderRadius: 20,
            boxShadow: '20px -20px 10px -10px red, -20px -20px 10px -5px blue',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support box shadow for transparent elements', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            borderRadius: 20,
            boxShadow: '20px -20px 10px 5px red',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support box shadow spread with transparency', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            borderRadius: 20,
            boxShadow: '20px -20px 4px 5px rgba(0, 0, 0, 0.5)',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support inset box shadows', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            borderRadius: 20,
            boxShadow: '20px -20px 4px 5px inset rgba(0, 0, 0, 0.5)',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should be affected by container opacity', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            borderRadius: 20,
            boxShadow: '10px 10px 4px 5px black',
            opacity: 0.5,
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
