import { it, describe, expect } from 'vitest'

import { initFonts, loadDynamicAsset, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Text Decoration', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('Should work correctly when `text-decoration-line: line-through` and `text-align: right`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'line-through',
            color: 'white',
            textAlign: 'center',
          }}
        >
          你好! It doesn’t 안녕! exist, it never has. I’m nostalgic for a place
          that never existed.
        </div>
      </div>,
      {
        width: 200,
        height: 200,
        fonts,
        loadAdditionalAsset: (languageCode: string, segment: string) => {
          return loadDynamicAsset(languageCode, segment) as any
        },
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-line: underline` and `text-align: right`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            color: 'white',
            textAlign: 'right',
          }}
        >
          你好! It doesn’t 안녕! exist, it never has. I’m nostalgic for a place
          that never existed.
        </div>
      </div>,
      {
        width: 200,
        height: 200,
        fonts,
        loadAdditionalAsset: (languageCode: string, segment: string) => {
          return loadDynamicAsset(languageCode, segment) as any
        },
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-style: dotted`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            textDecorationStyle: 'dotted',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-style: dashed`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            textDecorationStyle: 'dashed',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with `text-decoration` and `transform`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          padding: 10,
          backgroundColor: '#fff',
          fontSize: 32,
        }}
      >
        <div
          style={{
            display: 'flex',
            transform: 'translate(5px, 5px)',
            padding: 10,
            textDecoration: 'underline',
          }}
        >
          lynn
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        loadAdditionalAsset: (languageCode: string, segment: string) => {
          return loadDynamicAsset(languageCode, segment) as any
        },
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-style: double`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            backgroundColor: '#91a8d0',
            textDecoration: 'underline double',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
        <div
          style={{
            backgroundColor: '#000',
            textDecoration: 'line-through double',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should skip ink by default when `text-decoration-line: underline`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 40,
          color: '#000',
          textDecorationLine: 'underline',
        }}
      >
        abgpqapa
      </div>,
      { width: 260, height: 120, fonts }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('Should render continuous line when `text-decoration-skip-ink: none`', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 40,
          color: '#000',
          textDecorationLine: 'underline',
          textDecorationSkipInk: 'none',
        }}
      >
        abgpqapa
      </div>,
      { width: 260, height: 120, fonts }
    )

    expect(toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('Should skip ink correctly with complex descenders', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 40,
          color: '#000',
          textDecorationLine: 'underline',
        }}
      >
        agayaqapajaya;a,a|a
      </div>,
      { width: 360, height: 160, fonts }
    )

    expect(toImage(svg, 360)).toMatchImageSnapshot()
  })

  describe('lines, styles, thickness and offset', () => {
    const render = (style: Record<string, string>) =>
      satori(
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: 'white',
            padding: 10,
          }}
        >
          <div style={{ fontSize: 32, color: 'black', ...style }}>Hgy text</div>
        </div>,
        { width: 220, height: 70, fonts }
      )

    it('should support the thickness in the shorthand', async () => {
      const svg = await render({ textDecoration: 'underline 6px red' })
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should draw several lines', async () => {
      const svg = await render({
        textDecoration: 'underline overline line-through',
        textDecorationColor: 'blue',
      })
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should draw wavy lines', async () => {
      const svg = await render({ textDecoration: 'underline wavy blue' })
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should support percentages of the font size as thickness', async () => {
      const svg = await render({
        textDecorationLine: 'underline',
        textDecorationStyle: 'dotted',
        textDecorationThickness: '15%',
      })
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should offset the underline from the baseline', async () => {
      const svg = await render({
        textDecoration: 'underline 2px red',
        textUnderlineOffset: '8px',
      })
      expect(toImage(svg, 220)).toMatchImageSnapshot()
    })

    it('should reset the longhands with the shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            textDecorationStyle: 'wavy',
            textDecorationThickness: '10px',
            textDecoration: 'line-through',
            color: 'green',
          }}
        >
          Text
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toContain('stroke="green"')
      expect(svg).toContain('stroke-width="1.6"')
      expect(svg).not.toContain('<path fill="none"')
    })

    it('should reset the line when the shorthand omits it', async () => {
      for (const textDecoration of [
        'red',
        'wavy blue',
        '2px',
        'dotted',
        'wavy blue 3px',
      ]) {
        const svg = await satori(
          <div style={{ textDecorationLine: 'underline', textDecoration }}>
            Text
          </div>,
          { width: 100, height: 100, fonts }
        )
        expect(svg, textDecoration).not.toContain('stroke')
      }
    })

    it('should combine the shorthand without a line with the longhand', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: 28,
            gap: 8,
            padding: 8,
          }}
        >
          <div
            style={{
              textDecoration: 'wavy blue 2px',
              textDecorationLine: 'underline',
            }}
          >
            Wavy
          </div>
          <div
            style={{
              textDecoration: 'dotted red',
              textDecorationLine: 'line-through overline',
            }}
          >
            Dotted
          </div>
        </div>,
        { width: 120, height: 110, fonts }
      )
      expect(toImage(svg, 120)).toMatchImageSnapshot()
    })

    it('should throw for invalid values', async () => {
      for (const style of [
        { textDecoration: 'underline underline' },
        { textDecoration: 'none underline' },
        { textDecoration: 'underline red blue' },
        { textDecorationLine: 'sideline' },
        { textDecorationStyle: 'zigzag' },
        { textDecorationThickness: 'thick' },
        { textUnderlineOffset: 'from-font' },
      ]) {
        await expect(
          satori(<div style={style as any}>Text</div>, {
            width: 100,
            height: 100,
            fonts,
          }),
          JSON.stringify(style)
        ).rejects.toThrow()
      }
    })
  })
})
