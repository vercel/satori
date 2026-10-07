import { it, describe, expect } from 'vitest'

import { initFonts, toImageWithSharp } from './utils.js'
import satori from '../src/index.js'

// resvg 2.1, which `toImage` uses, doesn't support `paint-order`.
describe('paint-order', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const text = (style: any) => (
    <div
      style={{
        fontSize: 40,
        fontWeight: 700,
        color: '#fff',
        WebkitTextStroke: '6px #00f',
        ...style,
      }}
    >
      Ab
    </div>
  )

  it('should paint the stroke above the fill by default', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#eee',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {text({})}
        {text({ paintOrder: 'normal' })}
        {text({ paintOrder: 'fill' })}
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(svg).not.toContain('paint-order')
    expect(await toImageWithSharp(svg, 200)).toMatchImageSnapshot()
  })

  it('should paint the stroke below the fill', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#eee',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {text({ paintOrder: 'stroke' })}
        {text({ paintOrder: 'stroke fill' })}
        {text({ paintOrder: 'markers stroke' })}
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(await toImageWithSharp(svg, 200)).toMatchImageSnapshot()
  })

  it('should be inherited', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#eee',
          paintOrder: 'stroke',
          fontSize: 32,
          fontWeight: 700,
          color: '#ff0',
          WebkitTextStroke: '6px #000',
        }}
      >
        <span>Stroke</span>
        <span style={{ paintOrder: 'normal' }}>Normal</span>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImageWithSharp(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply to text without embedded fonts', async () => {
    const svg = await satori(
      <div style={{ display: 'flex' }}>{text({ paintOrder: 'stroke' })}</div>,
      { width: 100, height: 100, fonts, embedFont: false }
    )
    expect(svg).toMatch(/<text[^>]* paint-order="stroke"/)
  })

  it('should throw for invalid values', async () => {
    for (const value of ['stroke stroke', 'fill outline', 'normal fill']) {
      await expect(
        satori(<div style={{ paintOrder: value }}>Ab</div>, {
          width: 100,
          height: 100,
          fonts,
        })
      ).rejects.toThrow('Invalid `paintOrder` value')
    }
  })
})
