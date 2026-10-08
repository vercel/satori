import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('-webkit-text-fill-color', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should fill text instead of `color`', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#eee',
          fontSize: 30,
          color: '#f00',
          WebkitTextFillColor: '#080',
        }}
      >
        {/* `currentColor` is still `color`. */}
        <div style={{ borderBottom: '4px solid currentColor' }}>Fill</div>
        <div
          style={{
            textDecoration: 'underline',
            boxShadow: '4px 4px 0 currentColor',
            alignSelf: 'flex-start',
          }}
        >
          Color
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should be inherited and overridden', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#eee',
          fontSize: 24,
          WebkitTextFillColor: '#00f',
        }}
      >
        <span>Parent</span>
        <span style={{ color: '#f00' }}>Color</span>
        <span style={{ WebkitTextFillColor: '#f80' }}>Child</span>
        <span style={{ WebkitTextFillColor: 'currentcolor', color: '#0a0' }}>
          Current
        </span>
      </div>,
      { width: 100, height: 120, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should show only the stroke when transparent', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          background: '#ff0',
          fontSize: 40,
          fontWeight: 700,
          color: '#000',
          WebkitTextFillColor: 'transparent',
          WebkitTextStroke: '1px #000',
        }}
      >
        <span>Hollow</span>
        <span style={{ WebkitTextStrokeColor: '#f00' }}>Red</span>
      </div>,
      { width: 140, height: 100, fonts }
    )
    expect(await toImage(svg, 140)).toMatchImageSnapshot()
  })

  it('should keep the text shadow when transparent', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#eee',
          fontSize: 40,
          fontWeight: 700,
          WebkitTextFillColor: 'transparent',
          textShadow: '3px 3px 0 #f0f',
        }}
      >
        Shadow
      </div>,
      { width: 150, height: 60, fonts }
    )
    expect(await toImage(svg, 150)).toMatchImageSnapshot()
  })

  it('should show the background with `-webkit-background-clip: text`', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          fontSize: 34,
          fontWeight: 700,
          backgroundImage: 'linear-gradient(90deg, #f00, #00f)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        <span>Gradient</span>
        <span>Text</span>
      </div>,
      { width: 160, height: 100, fonts }
    )
    expect(await toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should fill text without embedded fonts', async () => {
    const svg = await satori(
      <div
        style={{ display: 'flex', color: '#f00', WebkitTextFillColor: '#0f0' }}
      >
        Text
      </div>,
      { width: 100, height: 100, fonts, embedFont: false }
    )
    expect(svg).toMatch(/<text[^>]* fill="#0f0"/)
  })
})
