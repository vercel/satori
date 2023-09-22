import { it, describe, expect } from 'vitest'

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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(toImage(svg, 100)).toMatchImageSnapshot()
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
})
