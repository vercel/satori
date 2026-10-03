import { it, describe, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import Sharp from 'sharp'

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

  it('should preserve letter-spacing across font fallbacks', async () => {
    const japaneseFont = await readFile(
      join(process.cwd(), 'test', 'assets', 'こんにちは')
    )
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          fontFamily: 'Roboto',
          fontSize: 48,
          letterSpacing: 18,
          padding: 20,
          backgroundColor: 'white',
          color: '#2563eb',
        }}
      >
        A日A
      </div>,
      {
        width: 260,
        height: 100,
        fonts: fonts.concat({
          name: 'Noto Sans JP',
          data: japaneseFont,
          weight: 400,
          style: 'normal',
        }),
      }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should preserve the word space after a hyphen or slash', async () => {
    const getLargestGap = async (text: string) => {
      const svg = await satori(
        <div
          style={{
            color: 'black',
            fontSize: 40,
            letterSpacing: 20,
          }}
        >
          {text}
        </div>,
        { width: 900, height: 80, fonts }
      )
      const { data, info } = await Sharp(toImage(svg, 900))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true })
      const hasInk = (x: number) => {
        for (let y = 0; y < info.height; y++) {
          const offset = (y * info.width + x) * info.channels
          if (data[offset + 3] > 5) {
            return true
          }
        }
        return false
      }

      const inkColumns = Array.from({ length: info.width }, (_, x) => x).filter(
        hasInk
      )
      let largestGap = 0
      for (let i = 1; i < inkColumns.length; i++) {
        largestGap = Math.max(largestGap, inkColumns[i] - inkColumns[i - 1] - 1)
      }
      return largestGap
    }

    const expectedWordGap = await getLargestGap('LOWCOST PLAN')
    expect(await getLargestGap('LOW-COST PLAN')).toBe(expectedWordGap)
    expect(await getLargestGap('A/B TEST')).toBe(expectedWordGap)
  })
})
