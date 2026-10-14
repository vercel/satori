import { it, describe, expect, vi } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { splitEffects } from '../src/utils.js'

describe('Units', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support %', async () => {
    const svg = await satori(
      <div
        style={{
          width: '30%',
          height: '10%',
          background: 'red',
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support em', async () => {
    const svg = await satori(
      <div
        style={{
          width: '2em',
          height: '3em',
          background: 'red',
          fontSize: 12,
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support vh and vw', async () => {
    const svg = await satori(
      <div
        style={{
          width: '10vw',
          height: '80vh',
          background: 'red',
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support rem', async () => {
    const svg = await satori(
      <div
        style={{
          width: '2rem',
          height: '3rem',
          background: 'red',
          fontSize: 12,
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support px and numbers', async () => {
    const svg = await satori(
      <div
        style={{
          width: '20px',
          height: 30,
          background: 'red',
          fontSize: 12,
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support rgb syntaxs', async () => {
    const svg = await satori(
      <div style={{ display: 'flex' }}>
        <div
          style={{
            width: 10,
            height: 10,
            background: 'rgb(100%,0%,0%)',
          }}
        ></div>
        <div
          style={{
            width: 10,
            height: 10,
            background: 'rgb(255 0 0 / 50%)',
          }}
        ></div>
        <div
          style={{
            width: 10,
            height: 10,
            background: 'rgb(255, 0, 0, 0.5)',
          }}
        ></div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support split multiple effect', () => {
    const tests = {
      'url(https:a.png), linear-gradient(blue, red)': [
        'url(https:a.png)',
        'linear-gradient(blue, red)',
      ],
      'rgba(0,0,0,.7)': ['rgba(0,0,0,.7)'],
      '1px 1px 2px black, 0 0 1em blue': ['1px 1px 2px black', '0 0 1em blue'],
      '2px 2px red, 4px 4px #4bf542, 6px 6px rgba(186, 147, 17, 30%)': [
        '2px 2px red',
        '4px 4px #4bf542',
        '6px 6px rgba(186, 147, 17, 30%)',
      ],
    }

    for (const [k, v] of Object.entries(tests)) {
      expect(splitEffects(k, ',')).toEqual(v)
    }

    ;[' ', /\s{1}/].forEach((v) => {
      expect(
        splitEffects(
          'drop-shadow(4px 4px 10px blue) blur(4px) saturate(150%)',
          v
        )
      ).toEqual([
        'drop-shadow(4px 4px 10px blue)',
        'blur(4px)',
        'saturate(150%)',
      ])
    })
  })

  it('should convert absolute lengths and viewport units', async () => {
    const box = (width: string, color: string) => (
      <div style={{ width, height: 10, background: color, marginBottom: 2 }} />
    )
    const svg = await satori(
      <div style={{ display: 'flex', flexDirection: 'column', padding: 4 }}>
        {box('1in', 'red')}
        {box('2.54cm', 'orange')}
        {box('25.4mm', 'gold')}
        {box('72pt', 'green')}
        {box('6pc', 'teal')}
        {box('101.6q', 'blue')}
        {box('25vmin', 'purple')}
        {box('25vmax', 'black')}
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should support viewport and line height units', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const render = (sizes: Record<string, string | number>[]) =>
      satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 10,
            lineHeight: 2,
          }}
        >
          {sizes.map((size, i) => (
            <div key={i} style={{ ...size, background: 'red' }} />
          ))}
        </div>,
        { width: 200, height: 100, fonts }
      )
    try {
      // The small, large and dynamic viewports of an image are the same.
      expect(
        await render([
          { width: '10svw', height: '5dvh' },
          { width: '10lvi', height: '5svb' },
          { width: '10dvmin', height: '5lvmax' },
          { width: 'calc(10svw + 1lh)', height: '1lh', maxWidth: 'none' },
          { width: '1rlh', height: '1rlh' },
        ])
      ).toBe(
        await render([
          { width: '10vw', height: '5vh' },
          { width: '10vw', height: '5vh' },
          { width: '10vmin', height: '5vmax' },
          { width: 40, height: 20 },
          { width: 19.2, height: 19.2 },
        ])
      )
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }
  })

  it('should resolve font size keywords and percentages', async () => {
    const svg = await satori(
      <div style={{ fontSize: 16, padding: 4 }}>
        <div style={{ fontSize: 'x-large' }}>x-large</div>
        <div style={{ fontSize: 'small' }}>small</div>
        <div style={{ fontSize: 'larger' }}>
          larger <span style={{ fontSize: 'smaller' }}>smaller</span>
        </div>
        <div style={{ fontSize: '150%' }}>150%</div>
        <div style={{ fontSize: '12pt' }}>12pt</div>
      </div>,
      { width: 200, height: 160, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })
})
