import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('mix-blend-mode', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const modes = [
    'normal',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'color-dodge',
    'color-burn',
    'hard-light',
    'soft-light',
    'difference',
    'exclusion',
    'hue',
    'saturation',
    'color',
    'luminosity',
  ]

  it('should support all blend modes', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', flexWrap: 'wrap', width: 200 }}>
        {modes.map((mode) => (
          <div
            key={mode}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 50,
              height: 50,
              backgroundImage: 'linear-gradient(90deg, #f00, #00f)',
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundImage: 'linear-gradient(#ff0, #0f8)',
                mixBlendMode: mode as any,
              }}
            />
          </div>
        ))}
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should blend with everything painted before', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ff0',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 10,
            width: 50,
            height: 80,
            background: '#f0f',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 30,
            top: 30,
            width: 60,
            height: 40,
            background: '#0ff',
            mixBlendMode: 'multiply',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should not blend with elements painted after', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ff0',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 30,
            top: 30,
            width: 60,
            height: 40,
            background: '#0ff',
            mixBlendMode: 'multiply',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 10,
            width: 50,
            height: 80,
            background: '#f0f',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should blend an element with its descendants as a group', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ff0',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 70,
            height: 70,
            background: '#0ff',
            mixBlendMode: 'difference',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 40, height: 40, background: '#f0f' }} />
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should only blend within the parent stacking context', async () => {
    // From left to right, the parent doesn't create a stacking context, has
    // `isolation: isolate`, `opacity` and `z-index`.
    const parents = [
      {},
      { isolation: 'isolate' },
      { opacity: 0.99 },
      { position: 'relative', zIndex: 0 },
    ]
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ff0',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        {parents.map((style, i) => (
          <div key={i} style={{ display: 'flex', ...(style as any) }}>
            <div
              style={{
                width: 40,
                height: 80,
                background: '#0ff',
                mixBlendMode: 'multiply',
              }}
            />
          </div>
        ))}
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should blend with the backdrop inside an isolated parent', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ff0',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            isolation: 'isolate',
            width: 80,
            height: 80,
            background: '#f0f',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 50,
              height: 50,
              background: '#0ff',
              mixBlendMode: 'multiply',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should blend text and images', async () => {
    const image =
      'data:image/svg+xml;base64,' +
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#0ff"/><circle cx="20" cy="20" r="12" fill="#fff"/></svg>'
      ).toString('base64')
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundImage: 'linear-gradient(90deg, #f00, #00f)',
          alignItems: 'center',
          justifyContent: 'space-around',
        }}
      >
        <div
          style={{
            fontSize: 40,
            fontWeight: 700,
            color: '#0f0',
            mixBlendMode: 'screen',
          }}
        >
          Blend
        </div>
        <img
          src={image}
          width={40}
          height={40}
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should blend transformed elements', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#ff0',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 40, height: 40, background: '#f0f' }} />
        <div
          style={{
            width: 40,
            height: 40,
            marginLeft: -20,
            background: '#0ff',
            transform: 'rotate(30deg)',
            mixBlendMode: 'multiply',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should not wrap elements with `normal` blending', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', mixBlendMode: 'normal' }}>
        <div style={{ isolation: 'isolate', width: 10, height: 10 }} />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(svg).not.toContain('mix-blend-mode')
    expect(svg).not.toContain('isolation')
  })

  it('should throw for invalid values', async () => {
    await expect(
      satori(<div style={{ mixBlendMode: 'add' as any }} />, {
        width: 100,
        height: 100,
        fonts,
      })
    ).rejects.toThrow('Invalid value for CSS property "mixBlendMode"')
    await expect(
      satori(<div style={{ isolation: 'none' as any }} />, {
        width: 100,
        height: 100,
        fonts,
      })
    ).rejects.toThrow('Invalid value for CSS property "isolation"')
  })

  it('should blend background layers', async () => {
    const image =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="20" height="40" fill="#3a3"/><circle cx="30" cy="20" r="10" fill="#c3c"/></svg>'
      )
    const box = (style: Record<string, string | number>) => (
      <div style={{ width: 90, height: 70, ...style }} />
    )
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          padding: 6,
          background: '#eee',
        }}
      >
        {box({
          backgroundColor: '#f80',
          backgroundImage: 'linear-gradient(to right, #00f, #fff)',
          backgroundBlendMode: 'multiply',
        })}
        {box({
          backgroundImage:
            'radial-gradient(circle, #f00, transparent 70%), linear-gradient(#0f0, #00f)',
          backgroundBlendMode: 'screen, normal',
        })}
        {box({
          backgroundColor: '#ff0',
          backgroundImage: `url("${image}")`,
          backgroundBlendMode: 'luminosity',
        })}
        {box({
          backgroundColor: '#888',
          backgroundImage:
            'linear-gradient(45deg, #f00, #00f), linear-gradient(-45deg, #0f0, #fff), radial-gradient(#fff, #000)',
          backgroundBlendMode: 'difference',
        })}
        {/* The layers don't blend with the parent. */}
        <div style={{ background: '#f00', padding: 6 }}>
          {box({
            width: 78,
            height: 58,
            backgroundColor: '#0ff',
            backgroundImage: 'linear-gradient(#fff, #000)',
            backgroundBlendMode: 'difference',
          })}
        </div>
        {box({
          backgroundColor: '#36c',
          backgroundImage: 'linear-gradient(to bottom, #fff, transparent)',
          backgroundBlendMode: 'overlay',
          borderRadius: 16,
          border: '4px solid #333',
        })}
      </div>,
      { width: 420, height: 170, fonts }
    )
    expect(await toImage(svg, 420)).toMatchImageSnapshot()
  })

  it('should throw for invalid background blend modes', async () => {
    await expect(
      satori(
        <div
          style={{
            backgroundImage: 'linear-gradient(red, blue)',
            backgroundBlendMode: 'multiply, plus-lighter',
          }}
        />,
        { width: 100, height: 100, fonts }
      )
    ).rejects.toThrow('backgroundBlendMode')
  })
})
