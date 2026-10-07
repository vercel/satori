import { it, describe, expect } from 'vitest'

import { initFonts, formatSVG } from './utils.js'
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
    expect(formatSVG(svg)).toMatchInlineSnapshot(`
      "<svg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>
      <mask id='satori_om-id'>
      <rect x='0' y='0' width='100' height='100' fill='#fff'/>
      </mask>
      <mask id='satori_om-id-2'>
      <rect x='50' y='50' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='50' y='50' width='50' height='50' fill='green'/>
      <mask id='satori_om-id-1'>
      <rect x='30' y='30' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='30' y='30' width='50' height='50' fill='blue'/>
      <mask id='satori_om-id-0'>
      <rect x='10' y='10' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='10' y='10' width='50' height='50' fill='red'/>
      </svg>"
    `)
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
    expect(formatSVG(svg)).toMatchInlineSnapshot(`
      "<svg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>
      <mask id='satori_om-id'>
      <rect x='0' y='0' width='100' height='100' fill='#fff'/>
      </mask>
      <rect x='0' y='0' width='100' height='100' fill='white'/>
      <mask id='satori_om-id-1'>
      <rect x='25' y='25' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='25' y='25' width='50' height='50' fill='red'/>
      <mask id='satori_om-id-0'>
      <rect x='0' y='0' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='0' y='0' width='50' height='50' fill='blue'/>
      </svg>"
    `)
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
    expect(formatSVG(svg)).toMatchInlineSnapshot(`
      "<svg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>
      <mask id='satori_om-id'>
      <rect x='0' y='0' width='100' height='100' fill='#fff'/>
      </mask>
      <mask id='satori_om-id-1'>
      <rect x='25' y='0' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='25' y='0' width='50' height='50' fill='red'/>
      <mask id='satori_om-id-0'>
      <rect x='0' y='0' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='0' y='0' width='50' height='50' fill='blue'/>
      </svg>"
    `)
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
    expect(formatSVG(svg)).toMatchInlineSnapshot(`
      "<svg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>
      <mask id='satori_om-id'>
      <rect x='0' y='0' width='100' height='100' fill='#fff'/>
      </mask>
      <mask id='satori_om-id-1'>
      <rect x='25' y='0' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='25' y='0' width='50' height='50' fill='red'/>
      <mask id='satori_om-id-0'>
      <rect x='0' y='0' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='0' y='0' width='50' height='50' fill='blue'/>
      </svg>"
    `)
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
      const fills = svg.match(/fill="(red|green|blue)"/g)
      expect(fills).toEqual(['fill="blue"', 'fill="red"', 'fill="green"'])
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
    expect(formatSVG(svg)).toMatchInlineSnapshot(`
      "<svg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'>
      <mask id='satori_om-id'>
      <rect x='0' y='0' width='100' height='100' fill='#fff'/>
      </mask>
      <mask id='satori_om-id-1'>
      <rect x='0' y='0' width='80' height='80' fill='#fff'/>
      </mask>
      <rect x='0' y='0' width='80' height='80' fill='blue'/>
      <mask id='satori_om-id-0'>
      <rect x='50' y='50' width='50' height='50' fill='#fff'/>
      </mask>
      <rect x='50' y='50' width='50' height='50' fill='red'/>
      </svg>"
    `)
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
