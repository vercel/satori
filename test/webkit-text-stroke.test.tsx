import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('webkit-text-stroke', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should work basic text stroke', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          fontSize: 30,
          background: '#ebebeb',
          color: '#ffffff',
          WebkitTextStroke: '4px #000000',
        }}
      >
        Hello, world
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work nested text stroke', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: 100,
          height: 100,
          fontSize: 30,
          background: '#ebebeb',
          color: '#ffffff',
          WebkitTextStroke: '4px #000000',
        }}
      >
        Hello, <span style={{ WebkitTextStrokeColor: '#ff0000' }}>world</span>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work nested and complex text stroke', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: 100,
          height: 100,
          fontSize: 30,
          background: '#ebebeb',
          color: '#ffffff',
          WebkitTextStroke: '4px #000000',
        }}
      >
        Hello,
        <span style={{ WebkitTextStrokeColor: '#f00' }}>w</span>
        <span style={{ WebkitTextStrokeColor: '#ff0' }}>o</span>
        <span style={{ WebkitTextStrokeColor: '#0f0' }}>r</span>
        <span style={{ WebkitTextStrokeColor: '#0ff' }}>l</span>
        <span style={{ WebkitTextStrokeColor: '#00f' }}>d</span>
        <span
          style={{
            WebkitTextStrokeColor: '#f0f',
            WebkitTextStrokeWidth: '6px',
          }}
        >
          !
        </span>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should accept the shorthand values in any order', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#ebebeb',
          fontSize: 24,
          fontWeight: 700,
          color: '#fff',
        }}
      >
        <span style={{ WebkitTextStroke: 'rgb(255, 0, 0) 2px' }}>Color</span>
        <span style={{ WebkitTextStroke: 'thin #00f' }}>Thin</span>
        <span style={{ WebkitTextStroke: 'medium #00f' }}>Medium</span>
        <span style={{ WebkitTextStroke: '#00f thick' }}>Thick</span>
      </div>,
      { width: 100, height: 120, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should use the current color by default', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#ebebeb',
          fontSize: 24,
          fontWeight: 700,
          color: '#00f',
        }}
      >
        {/* The shorthand resets the color, the width longhand keeps it. */}
        <span style={{ WebkitTextStroke: '3px' }}>Short</span>
        <span style={{ WebkitTextStrokeWidth: 3, color: '#f00' }}>Long</span>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            WebkitTextStroke: '1px #000',
          }}
        >
          <span style={{ WebkitTextStroke: '3px' }}>Reset</span>
          <span style={{ WebkitTextStrokeWidth: 3 }}>Keep</span>
        </div>
      </div>,
      { width: 100, height: 120, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should draw only the outline of transparent text', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ff0',
          fontSize: 44,
          fontWeight: 700,
          color: 'transparent',
          WebkitTextStroke: '1.5px #000',
          alignItems: 'center',
        }}
      >
        Outline
      </div>,
      { width: 160, height: 60, fonts }
    )
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should support relative widths', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ebebeb',
          fontSize: 40,
          color: '#fff',
          WebkitTextStroke: '0.1em #000',
        }}
      >
        <span>Em</span>
        <span style={{ fontSize: 20 }}>Em</span>
      </div>,
      { width: 100, height: 60, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should throw for invalid values', async () => {
    for (const value of ['1px 2px', 'red blue', '1px red blue', '']) {
      await expect(
        satori(<div style={{ WebkitTextStroke: value }}>Ab</div>, {
          width: 100,
          height: 100,
          fonts,
        })
      ).rejects.toThrow('Invalid `WebkitTextStroke` value')
    }
    await expect(
      satori(<div style={{ WebkitTextStrokeWidth: 'red' }}>Ab</div>, {
        width: 100,
        height: 100,
        fonts,
      })
    ).rejects.toThrow('Invalid `WebkitTextStrokeWidth` value')
  })
})
