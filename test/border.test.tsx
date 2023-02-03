import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Border', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('border', () => {
    it('should support the shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-color', () => {
    it('should render black border by default', async () => {
      const svg = await satori(
        <div
          style={{ border: '1px solid', width: '50%', height: '50%' }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should fallback border color to the current color', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            color: 'red',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support specifying `borderColor`', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px',
            borderColor: 'green',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support overriding borderColor', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px blue',
            borderColor: 'red',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-width', () => {
    it('should render border inside the shape', async () => {
      const svg = await satori(
        <div
          style={{ border: '5px solid black', width: 50, height: 50 }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-style', () => {
    it('should support dashed border', async () => {
      const svg = await satori(
        <div
          style={{ border: '5px dashed black', width: 50, height: 50 }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-radius', () => {
    it('should support the shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: '10px',
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support radius for a certain corner', async () => {
      const svg = await satori(
        <div
          style={{
            borderTopRightRadius: '50px',
            borderTopLeftRadius: '10px',
            borderBottomLeftRadius: '60px',
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should not exceed the length of the short side', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: 100,
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 50,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support percentage border radius', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: '100% 10px',
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 50,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support vw vh em and rem units', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            fontSize: '8px',
          }}
        >
          <div
            style={{
              borderRadius: '50vw 25vh 1em 1rem',
              background: 'red',
              width: '100%',
              height: '100%',
            }}
          ></div>
        </div>,
        {
          width: 100,
          height: 50,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support slash and 2-value corner', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            fontSize: '8px',
          }}
        >
          <div
            style={{
              borderRadius: '50px 25% / 10px 20px',
              borderTopLeftRadius: '10px 50px',
              background: 'red',
              width: '100%',
              height: '100%',
            }}
          ></div>
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('directional', () => {
    it('should support directional border', async () => {
      const svg = await satori(
        <div
          style={{
            borderTop: '1px solid red',
            borderRight: '2px solid green',
            borderBottom: '3px solid blue',
            borderLeft: '4px solid yellow',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support non-complete border', async () => {
      const svg = await satori(
        <div
          style={{
            borderTop: '10px solid red',
            borderBottom: '5px dashed blue',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support advanced border with radius', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: '10px 20%',
            borderTopLeftRadius: '10px 25px',
            borderTop: '10px solid red',
            borderBottom: '5px dashed blue',
            borderLeft: '2px solid yellow',
            borderRight: '5px dashed blue',
            background: 'gray',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
