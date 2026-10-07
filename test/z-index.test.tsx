import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('z-index', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should paint elements in z-index order', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            width: 50,
            height: 50,
            background: 'red',
            zIndex: 2,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 30,
            left: 30,
            width: 50,
            height: 50,
            background: 'blue',
            zIndex: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 50,
            width: 50,
            height: 50,
            background: 'green',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should paint negative z-index above the background of the stacking context', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: 'white',
        }}
      >
        <div style={{ width: 50, height: 50, background: 'blue' }} />
        <div
          style={{
            position: 'absolute',
            top: 25,
            left: 25,
            width: 50,
            height: 50,
            background: 'red',
            zIndex: -1,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should paint positioned elements above static ones', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div
          style={{
            width: 50,
            height: 50,
            marginRight: -25,
            background: 'blue',
          }}
        />
        <div
          style={{
            position: 'static',
            width: 50,
            height: 50,
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support z-index on static elements', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div
          style={{
            position: 'static',
            width: 50,
            height: 50,
            marginRight: -25,
            background: 'blue',
            zIndex: 1,
          }}
        />
        <div style={{ width: 50, height: 50, background: 'red' }} />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should keep z-index within its stacking context', async () => {
    for (const stackingContextStyle of [{ zIndex: 1 }, { opacity: 0.5 }]) {
      const svg = await satori(
        <div style={{ display: 'flex', width: '100%', height: '100%' }}>
          <div
            style={{
              display: 'flex',
              width: 50,
              height: 50,
              background: 'blue',
              ...stackingContextStyle,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                width: 50,
                height: 50,
                background: 'red',
                zIndex: 100,
              }}
            />
          </div>
          <div
            style={{
              position: 'absolute',
              top: 40,
              left: 40,
              width: 50,
              height: 50,
              background: 'green',
              zIndex: 2,
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    }
  })

  it('should support z-index on fixed elements', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div
          style={{
            position: 'fixed',
            right: 0,
            bottom: 0,
            width: 50,
            height: 50,
            background: 'red',
            zIndex: 1,
          }}
        />
        <div style={{ width: 80, height: 80, background: 'blue' }} />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should throw for invalid values', async () => {
    await expect(
      satori(<div style={{ zIndex: 1.5 }} />, {
        width: 100,
        height: 100,
        fonts,
      })
    ).rejects.toThrowError('Invalid `zIndex` value: "1.5".')
  })
})
