import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Letter Spacing', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render text with positive letter-spacing', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: 5,
        }}
      >
        Hello World
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render text with negative letter-spacing', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: -2,
        }}
      >
        Hello World
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render text with zero letter-spacing', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: 0,
        }}
      >
        Hello World
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render text with large letter-spacing', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: 10,
        }}
      >
        Hello
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render text with very small letter-spacing', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: 1,
        }}
      >
        Hello World
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with different font sizes', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ fontSize: 12, letterSpacing: 3 }}>Small Text</div>
        <div style={{ fontSize: 20, letterSpacing: 3 }}>Medium Text</div>
        <div style={{ fontSize: 30, letterSpacing: 3 }}>Large</div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with text-align left', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          fontSize: 16,
          letterSpacing: 4,
          textAlign: 'left',
        }}
      >
        Hello
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with text-align center', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          fontSize: 16,
          letterSpacing: 4,
          textAlign: 'center',
        }}
      >
        Hello
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with text-align right', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          fontSize: 16,
          letterSpacing: 4,
          textAlign: 'right',
        }}
      >
        Hello
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with wrapped text', async () => {
    const svg = await satori(
      <div
        style={{
          width: 80,
          fontSize: 16,
          letterSpacing: 3,
        }}
      >
        Hello World Testing
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with text-decoration underline', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: 5,
          textDecoration: 'underline',
        }}
      >
        Hello
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with text-decoration line-through', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: 5,
          textDecoration: 'line-through',
        }}
      >
        Hello
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with color', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 24,
          letterSpacing: 4,
          color: 'blue',
          background: 'lightyellow',
        }}
      >
        Colored
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with background-clip text', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 24,
          letterSpacing: 3,
          background: 'linear-gradient(90deg, red, blue)',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        Gradient
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with text-shadow', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 24,
          letterSpacing: 4,
          textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)',
        }}
      >
        Shadow
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with font-weight bold', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: 3,
          fontWeight: 'bold',
        }}
      >
        Bold Text
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with opacity', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 24,
          letterSpacing: 5,
          opacity: 0.5,
        }}
      >
        Faded
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with multiple lines', async () => {
    const svg = await satori(
      <div
        style={{
          width: 90,
          fontSize: 16,
          letterSpacing: 2,
          lineHeight: 1.5,
        }}
      >
        This is a multiline text with letter spacing
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing on single character', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 40,
          letterSpacing: 10,
        }}
      >
        A
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with mixed case text', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 20,
          letterSpacing: 3,
        }}
      >
        HeLLo WoRLd
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render letter-spacing with numbers', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 24,
          letterSpacing: 5,
        }}
      >
        12345
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
