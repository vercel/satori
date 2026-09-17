import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import parseTransformOrigin from '../src/transform-origin.js'

describe('transform', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('transform-origin', () => {
    const matrixOf = async (transformOrigin) =>
      (
        await satori(
          <div
            style={{
              width: 20,
              height: 20,
              backgroundColor: 'red',
              transform: 'rotate(90deg)',
              transformOrigin,
            }}
          />,
          { width: 100, height: 100, fonts }
        )
      ).match(/matrix\([^)]*\)/)[0]

    it('treats a zero origin as the corner, like the keyword form', async () => {
      // `0 0` / `0% 0%` are the top-left corner, identical to `left top`; a zero
      // component must not be dropped so the axis falls back to center.
      const corner = await matrixOf('left top')
      expect(await matrixOf('0 0')).toBe(corner)
      expect(await matrixOf('0px 0px')).toBe(corner)
      expect(await matrixOf('0% 0%')).toBe(corner)
    })

    it('keeps a zero component in the two-value form', () => {
      expect(parseTransformOrigin('left 0', 16)).toEqual({
        xRelative: 0,
        yAbsolute: 0,
      })
      expect(parseTransformOrigin('50% 0', 16)).toEqual({
        xRelative: 50,
        yAbsolute: 0,
      })
    })
  })

  describe('translate', () => {
    it('should translate shape', async () => {
      const svg = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
            transform: 'translate(10px,20px)',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should translate shape in x-axis', async () => {
      const svg = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
            transform: 'translateX(10px)',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should translate shape in y-axis', async () => {
      const svg = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
            transform: 'translateY(10px)',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support %', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 50,
            height: 10,
            backgroundColor: 'red',
            transform: 'translate(100%,100%)',
          }}
        >
          <div
            style={{
              width: 50,
              height: 10,
              backgroundColor: 'blue',
              transform: 'translate(-100%,100%) rotate(90deg)',
            }}
          />
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

  describe('rotate', () => {
    it('should rotate shape', async () => {
      const svg = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
            transform: 'rotate(30deg)',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
    it('should rotate text with overflow', async () => {
      const svg = await satori(
        <div
          style={{
            transform: 'rotate(40deg)',
            width: '200px',
            height: '20px',
            overflow: 'hidden',
            backgroundColor: 'red',
          }}
        >
          Hello, World Hello, World
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

  describe('scale', () => {
    it('should scale shape', async () => {
      const svg = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
            transform: 'scale(1.5)',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should scale shape in two directions', async () => {
      const svg = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
            transform: 'scale(2, 3)',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('multiple transforms', () => {
    it('should support translate rotate and scale', async () => {
      const svg = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
            transform: 'rotate(45deg) scale(2, 0.2) translate(50px, 50px)',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('behavior with parent overflow', () => {
    it('should not inherit parent clip-path', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: 20,
            height: 20,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: 15,
              height: 15,
              backgroundColor: 'red',
              transform: 'rotate(45deg) translate(15px, 5px)',
            }}
          />
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
})
