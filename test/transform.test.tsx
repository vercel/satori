import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('transform', () => {
  let fonts
  initFonts((f) => (fonts = f))

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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  it('should keep small scales and rotations precise', async () => {
    // The red bar grows by 2px on each side, and the blue one slopes by ~3.5px.
    // With only 2 decimals in the matrix, the red bar was shifted left instead
    // of scaled, and the blue one stayed level.
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-around',
          width: '100%',
          height: '100%',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            marginLeft: 100,
            width: 800,
            height: 20,
            backgroundColor: 'red',
            transform: 'scale(1.005)',
          }}
        />
        <div
          style={{
            marginLeft: 100,
            width: 800,
            height: 20,
            backgroundColor: 'blue',
            transform: 'rotate(0.25deg)',
          }}
        />
      </div>,
      {
        width: 1000,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 1000)).toMatchImageSnapshot()
  })

  it('should support the individual transform properties', async () => {
    const box = (background: string, style = {}) => ({
      width: 40,
      height: 40,
      background,
      ...style,
    })
    const svg = await satori(
      <div style={{ display: 'flex', gap: 20, padding: 20 }}>
        <div style={box('red', { translate: '10px 20px' })} />
        <div style={box('green', { rotate: '30deg' })} />
        <div style={box('blue', { scale: '1.3 0.7' })} />
        {/* Applied in this order, before `transform`. */}
        <div
          style={box('orange', {
            translate: '50%',
            rotate: '20deg',
            scale: 0.8,
            transform: 'skewX(10deg)',
          })}
        />
        <div
          style={box('purple', {
            rotate: 'z 45deg',
            transformOrigin: 'top left',
          })}
        />
        <div style={box('teal', { rotate: 'x 60deg' })} />
        <div style={box('gray', { scale: '150%', translate: '0 -10px' })} />
      </div>,
      { width: 420, height: 90, fonts }
    )
    expect(await toImage(svg, 420)).toMatchImageSnapshot()
  })

  describe('none', () => {
    it('should accept transform none as identity', async () => {
      const withNone = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
            transform: 'none',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      const without = await satori(
        <div
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'red',
          }}
        />,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(withNone).toBe(without)
    })
  })
})
