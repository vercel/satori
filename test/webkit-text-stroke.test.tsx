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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should parse functional colors and either value order', async () => {
    const render = (WebkitTextStroke: string) =>
      satori(<div style={{ fontSize: 30, WebkitTextStroke }}>Hello</div>, {
        width: 100,
        height: 100,
        fonts,
      })

    expect(await render('2px rgba(0, 0, 0, 0.5)')).toContain(
      'stroke-width="2px" stroke="rgba(0, 0, 0, 0.5)"'
    )
    expect(await render('rgba(0, 0, 0, 0.5) 2px')).toBe(
      await render('2px rgba(0, 0, 0, 0.5)')
    )
    expect(await render('red 2px')).toBe(await render('2px red'))
  })
})
