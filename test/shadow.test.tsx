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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should work correct with zero border radius', async () => {
      const svg = await satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            borderRadius: '0%',
            boxShadow: '0px 0px 0px 10px black',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    const renderBoxShadow = (
      boxShadow?: string,
      onStyleError?: (error: Error) => void
    ) =>
      satori(
        <div
          style={{
            width: 50,
            height: 50,
            margin: '25px 25px',
            background: 'white',
            color: 'blue',
            fontSize: 8,
            boxShadow,
          }}
        ></div>,
        { width: 100, height: 100, fonts, onStyleError }
      )

    it('should parse the color and inset before or after the lengths', async () => {
      const svg = await renderBoxShadow(
        'inset 10px -10px 4.5px 5px rgba(0, 0, 0, 0.5), 10px 10px 4px red'
      )
      expect(svg).not.toContain('NaN')
      expect(
        await renderBoxShadow(
          'rgba(0, 0, 0, 0.5) 10px -10px 4.5px 5px inset, red 10px 10px 4px'
        )
      ).toBe(svg)
    })

    it('should default the blur and spread radii to 0', async () => {
      const svg = await renderBoxShadow('10px 10px 0 0 red')
      expect(await renderBoxShadow('10px 10px red')).toBe(svg)
      expect(svg).not.toContain('NaN')
    })

    it('should draw box shadows without a color in the current color', async () => {
      expect(await renderBoxShadow('10px 10px 4px')).toBe(
        await renderBoxShadow('10px 10px 4px blue')
      )
    })

    it('should resolve relative lengths and math functions', async () => {
      const svg = await renderBoxShadow('8px 4px 16px red')
      expect(await renderBoxShadow('1em .5em 1rem red')).toBe(svg)
      expect(await renderBoxShadow('calc(4px + 4px) 4px 16px red')).toBe(svg)
    })

    it('should not draw box shadows of none', async () => {
      expect(await renderBoxShadow('none')).toBe(await renderBoxShadow())
    })

    it('should report invalid box shadows with onStyleError', async () => {
      const errors: string[] = []
      const svg = await renderBoxShadow('10px red', (error) =>
        errors.push(error.message)
      )
      expect(errors).toHaveLength(1)
      expect(svg).toBe(await renderBoxShadow())
    })

    it('should show box shadow without specifying height', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 100,
            padding: 10,
            background: 'white',
          }}
        >
          <div
            style={{
              display: 'flex',
              boxShadow: '10px 10px 10px green',
              width: `50px`,
              height: '50px',
              background: 'rgba(0,0,0,0.5)',
            }}
          ></div>
        </div>,
        { width: 100, fonts }
      )
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support multiple text shadows', async () => {
      const svg = await satori(
        <div
          style={{
            background: 'white',
            width: 100,
            height: 100,
            fontSize: 40,
            textShadow: '2px 2px 2px red, 4px .25rem .25rem blue',
          }}
        >
          Hello
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support text shadows if exist unexpected comma', async () => {
      const svg = await satori(
        <div
          style={{
            background: 'white',
            width: 100,
            height: 100,
            fontSize: 40,
            textShadow:
              '2px 2px red, 4px 4px #4bf542, 6px 6px rgb(186, 147, 17)',
          }}
        >
          Lynn
        </div>,
        { width: 100, height: 100, fonts }
      )

      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support text shadows with transparent text color', async () => {
      const svg = await satori(
        <div
          style={{
            background: 'white',
            width: 100,
            height: 100,
            fontSize: 40,
            color: 'transparent',
            textShadow: 'red 0px 0px 5px',
          }}
        >
          Hello
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support text shadows with backgroundClip text', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 40,
            background: 'linear-gradient(90deg, #ff00bc, #6400ff)',
            backgroundClip: 'text',
            color: '#ffffffff',
            textShadow: '0px 0px 5px #000',
          }}
        >
          Hello
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support text shadows with backgroundClip and no background', async () => {
      const svg = await satori(
        <div
          style={{
            width: 100,
            height: 100,
            fontSize: 40,
            backgroundClip: 'text',
            color: 'white',
            textShadow:
              '0px 0px 3px #9400d3,0px 0px 4px #9400d3,0px 0px 5px #9400d3,0px 0px 5px #9400d3,0px 0px 5px #9400d3,0px 0px 5px #9400d3,0px 0px 5px #9400d3,0px 0px 5px #9400d3,0px 0px 5px #9400d3,0px 0px 5px #9400d3',
          }}
        >
          Hello
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
