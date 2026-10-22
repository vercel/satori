import { join } from 'node:path'
import { it, describe, expect, vi } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { readFile } from 'node:fs/promises'

// fflate is pinned to 0.7, but apps may resolve 0.8, where the second argument
// of `inflateSync` is options instead of an output buffer, so it's ignored.
vi.mock('fflate', async (importOriginal) => {
  const fflate = await importOriginal<typeof import('fflate')>()
  return {
    ...fflate,
    inflateSync: (data: Uint8Array) => fflate.inflateSync(data),
  }
})

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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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

    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  describe('font-size', () => {
    it('should allow font-size to be 0', async () => {
      const svg = await satori(<div style={{ fontSize: 0 }}>hi</div>, {
        width: 100,
        height: 100,
        fonts,
      })
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
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

    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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

    for (const svg of svgs) {
      expect(await toImage(svg, 100)).toMatchImageSnapshot()
    }
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

    expect(await toImage(svg)).toMatchImageSnapshot()
  })

  it('should render WOFF fonts the same as the TTF they were built from', async () => {
    const render = async (file: string) =>
      satori(<div style={{ fontSize: 32 }}>Hello</div>, {
        width: 200,
        height: 50,
        fonts: [
          {
            name: 'Habbo',
            data: await readFile(join(process.cwd(), 'test', 'assets', file)),
            weight: 400,
            style: 'normal',
          },
        ],
      })

    expect(await render('Habbo.woff')).toBe(await render('Habbo.ttf'))
  })

  describe('WOFF2', () => {
    const asset = (name: string) =>
      readFile(join(process.cwd(), 'test', 'assets', name))
    const text = (
      <div style={{ display: 'flex', fontSize: 32, fontFamily: 'Roboto' }}>
        Hello, WOFF2! fi
      </div>
    )

    it('should render like the TrueType font it was encoded from', async () => {
      const [ttf, woff2] = await Promise.all([
        asset('Roboto-Regular.ttf'),
        asset('Roboto-Regular.woff2'),
      ])
      for (const embedFont of [true, false]) {
        const render = (data: Buffer) =>
          satori(text, {
            width: 300,
            height: 60,
            embedFont,
            fonts: [{ name: 'Roboto', data, weight: 400, style: 'normal' }],
          })
        expect(await render(woff2)).toBe(await render(ttf))
      }
    })

    it('should decode WOFF2 fonts with overlap bitmaps', async () => {
      // A subset of Inter from Google Fonts, whose glyf table has an overlap
      // bitmap, and the TrueType font from Google's reference decoder.
      const [ttf, woff2] = await Promise.all([
        asset('Inter-HelloWorld.ttf'),
        asset('Inter-HelloWorld.woff2'),
      ])
      const render = (data: Buffer) =>
        satori(
          <div style={{ display: 'flex', fontSize: 32 }}>Hello World</div>,
          { width: 300, height: 60, fonts: [{ name: 'Inter', data }] }
        )
      const svg = await render(woff2)
      expect(svg).toContain('<path')
      expect(svg).toBe(await render(ttf))
    })

    it('should load WOFF2 fonts dynamically', async () => {
      const [hebrew, ttf, woff2] = await Promise.all([
        asset('NotoSansHebrew-Regular.ttf'),
        asset('Roboto-Regular.ttf'),
        asset('Roboto-Regular.woff2'),
      ])
      // The Latin text is missing from the Hebrew font.
      const render = (data: Buffer) =>
        satori(text, {
          width: 300,
          height: 60,
          fonts: [{ name: 'Hebrew', data: hebrew, weight: 400 }],
          loadAdditionalAsset: async () => [
            { name: 'Roboto', data, weight: 400 },
          ],
        })
      expect(await render(woff2)).toBe(await render(ttf))
    })

    it('should throw for invalid WOFF2 fonts', async () => {
      const woff2 = await asset('Roboto-Regular.woff2')
      await expect(
        satori(text, {
          width: 300,
          height: 60,
          fonts: [
            { name: 'Broken', data: woff2.subarray(0, 1000), weight: 400 },
          ],
        })
      ).rejects.toThrow('Failed to decode the WOFF2 font "Broken".')
    })
  })

  describe('variable fonts', () => {
    it('should render variable fonts as their default instance', async () => {
      // The Latin subset of the variable Geist Mono of nextjs.org, with a
      // `wght` axis of 100 to 900, and 400 by default.
      const [variable, regular] = await Promise.all(
        ['GeistMono-Variable.woff2', 'GeistMono-Regular.ttf'].map((name) =>
          readFile(join(process.cwd(), 'test', 'assets', name))
        )
      )
      const render = async (data: Buffer) => {
        let width = 0
        const svg = await satori(
          <div style={{ display: 'flex', fontSize: 32, fontFamily: 'Geist' }}>
            <span>Hello, World!</span>
          </div>,
          {
            width: 300,
            height: 60,
            fonts: [{ name: 'Geist', data, weight: 400, style: 'normal' }],
            onNodeDetected: (node) => {
              if (node.type === 'span') width = node.width
            },
          }
        )
        return { svg, width }
      }
      const { svg, width } = await render(variable)
      expect(svg).toContain('<path')
      expect(width).toBe((await render(regular)).width)
      expect(await toImage(svg, 300)).toMatchImageSnapshot()
    })

    const loadGeistMono = () =>
      Promise.all(
        ['GeistMono-Variable.woff2', 'GeistMono-Regular.ttf'].map((name) =>
          readFile(join(process.cwd(), 'test', 'assets', name))
        )
      )
    const weights = (
      geist: { name: string; data: Buffer; weight?: 400 }[],
      list: number[]
    ) =>
      satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 24,
            fontFamily: 'Geist',
          }}
        >
          {list.map((weight) => (
            <span key={weight} style={{ fontWeight: weight as any }}>
              Hello {weight}
            </span>
          ))}
        </div>,
        { width: 200, height: list.length * 30, fonts: geist }
      )

    it('should render the weights of variable fonts', async () => {
      const [variable] = await loadGeistMono()
      const geist = [{ name: 'Geist', data: variable, weight: 400 as const }]
      const [thin, regular, bold] = await Promise.all(
        [100, 400, 700].map((weight) => weights(geist, [weight]))
      )
      // The instances of the `wght` axis, without synthesized bold.
      expect(new Set([thin, regular, bold]).size).toBe(3)
      expect(bold).not.toContain('stroke-width')
      // The default instance is the font itself.
      expect(regular).toBe(
        await satori(
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 24,
              fontFamily: 'Geist',
            }}
          >
            <span>Hello 400</span>
          </div>,
          { width: 200, height: 30, fonts: geist }
        )
      )
      expect(
        await toImage(await weights(geist, [100, 400, 700, 900]), 200)
      ).toMatchImageSnapshot()
    })

    it('should prefer the weights of variable fonts to synthesized ones', async () => {
      const [variable, regular] = await loadGeistMono()
      // A static regular font synthesizes bold.
      const geist = [{ name: 'Geist', data: regular, weight: 400 as const }]
      expect(await weights(geist, [700])).toContain('stroke-width')
      // With a variable font of the family too, its bold is used.
      expect(
        await weights(
          [...geist, { name: 'Geist', data: variable, weight: 400 }],
          [700]
        )
      ).toBe(
        await weights([{ name: 'Geist', data: variable, weight: 400 }], [700])
      )
    })
  })

  describe('font shorthand', () => {
    const render = (style: Record<string, unknown>, errors?: string[]) =>
      satori(
        <div style={{ display: 'flex', fontSize: 16 }}>
          <div style={{ display: 'flex', width: 100, ...style }}>Text</div>
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
          onStyleError: errors
            ? (error) => errors.push(error.message)
            : undefined,
        }
      )

    it('should set the longhands', async () => {
      expect(
        await render({
          font: 'italic 700 20px/30px "Unknown",Roboto, sans-serif',
        })
      ).toBe(
        await render({
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 20,
          lineHeight: '30px',
          fontFamily: '"Unknown",Roboto, sans-serif',
        })
      )
    })

    it('should support math functions in font sizes', async () => {
      expect(await render({ font: 'calc(1em + 4px)/normal Roboto' })).toBe(
        await render({
          fontSize: 20,
          lineHeight: 'normal',
          fontFamily: 'Roboto',
        })
      )
    })

    it('should reset the longhands that are not given', async () => {
      expect(
        await render({ lineHeight: 3, fontWeight: 700, font: '16px Roboto' })
      ).toBe(
        await render({
          lineHeight: 'normal',
          fontWeight: 'normal',
          fontSize: 16,
          fontFamily: 'Roboto',
        })
      )
    })

    it('should support the keywords of the longhands', async () => {
      const errors: string[] = []
      expect(
        await render(
          { font: 'normal small-caps condensed 300 large/1.5 Roboto' },
          errors
        )
      ).toBe(
        await render({
          fontVariant: 'small-caps',
          fontStretch: 'condensed',
          fontWeight: 300,
          fontSize: 'large',
          lineHeight: 1.5,
          fontFamily: 'Roboto',
        })
      )
      expect(errors).toEqual([])
    })

    it('should report invalid values', async () => {
      const errors: string[] = []
      await render({ font: 'bold' }, errors)
      await render({ font: '16px/20px' }, errors)
      await render({ font: 'bold italic bold 16px Roboto' }, errors)
      expect(errors).toEqual([
        'Invalid value for CSS property "font": "bold".',
        'Invalid value for CSS property "font": "16px/20px".',
        'Invalid value for CSS property "font": "bold italic bold 16px Roboto".',
      ])
    })
  })
})
