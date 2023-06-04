import { join } from 'node:path'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { readFile } from 'node:fs/promises'

describe('Font', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should error when no font is specified', async () => {
    try {
      await satori(<div>hello</div>, {
        width: 100,
        height: 100,
        fonts: [],
      })
    } catch (e) {
      expect(e.message).toMatchInlineSnapshot(
        '"No fonts are loaded. At least one font is required to calculate the layout."'
      )
    }
  })

  it('should not error when no font is specified and no text rendered', async () => {
    const svg = await satori(<div></div>, {
      width: 100,
      height: 100,
      fonts: [],
    })
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should use correct fonts', async () => {
    const fontName = 'MontserratSubrayada'
    const fontPath = join(
      process.cwd(),
      'test',
      'assets',
      `${fontName}-Regular.ttf`
    )
    const fontData = await readFile(fontPath)
    const montserratFont = {
      name: fontName,
      data: fontData,
      weight: 400,
      style: 'normal',
    }
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: '20px',
          fontWeight: 400,
          color: 'yellow',
        }}
      >
        <div>Hello</div>
        <div style={{ fontFamily: fontName }}>Hello</div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts: fonts.concat(montserratFont),
      }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  describe('font-size', () => {
    it('should allow font-size to be 0', async () => {
      const svg = await satori(<div style={{ fontSize: 0 }}>hi</div>, {
        width: 100,
        height: 100,
        fonts,
      })
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  it('should handle font-family fallback', async () => {
    const fontName = 'MontserratSubrayada'
    const fontPath = join(
      process.cwd(),
      'test',
      'assets',
      `${fontName}-Regular.ttf`
    )
    const fontData = await readFile(fontPath)
    const montserratFont = {
      name: fontName,
      data: fontData,
    }
    const svg = await satori(
      <div
        style={{
          fontSize: '3rem',
        }}
      >
        Hello
      </div>,
      {
        width: 100,
        height: 100,
        fonts: [montserratFont],
      }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should handle font-size correctly for element like heading', async () => {
    const svgs = await Promise.all(
      [20, '0.8em', '1.2rem'].map((fontSize) =>
        satori(
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              fontSize,
              fontWeight: 600,
            }}
          >
            <h1 style={{ color: 'red' }}>Hello, World</h1>
            <h2 style={{ color: 'orange' }}>Hello, World</h2>
            <h5 style={{ color: 'grey', fontSize: 20 }}>Hello, World</h5>
          </div>,
          {
            width: 100,
            height: 100,
            fonts,
          }
        )
      )
    )

    svgs.forEach((svg) => {
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  it('should handle escape html when embedFont is false', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: '16px',
        }}
      >
        {`Hello<>&'" world`}
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        embedFont: false,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })
})
