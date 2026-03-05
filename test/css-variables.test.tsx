import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('CSS Variables', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support basic CSS variable declaration and usage', async () => {
    const svg = await satori(
      <div
        style={{
          '--primary-color': 'red',
          backgroundColor: 'var(--primary-color)',
          width: '100%',
          height: '100%',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support CSS variable inheritance', async () => {
    const svg = await satori(
      <div
        style={{
          '--primary-color': 'blue',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--primary-color)',
            width: '50%',
            height: '100%',
          }}
        />
        <div
          style={{
            backgroundColor: 'var(--primary-color)',
            width: '50%',
            height: '100%',
          }}
        />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support CSS variable override in children', async () => {
    const svg = await satori(
      <div
        style={{
          '--primary-color': 'red',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--primary-color)',
            width: '50%',
            height: '100%',
          }}
        />
        <div
          style={{
            '--primary-color': 'green',
            backgroundColor: 'var(--primary-color)',
            width: '50%',
            height: '100%',
          }}
        />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support CSS variable fallback values', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: 'var(--undefined-color, yellow)',
          width: '100%',
          height: '100%',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support nested CSS variables', async () => {
    const svg = await satori(
      <div
        style={{
          '--base-color': 'purple',
          '--primary-color': 'var(--base-color)',
          backgroundColor: 'var(--primary-color)',
          width: '100%',
          height: '100%',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support CSS variables with dimensions', async () => {
    const svg = await satori(
      <div
        style={{
          '--box-size': '50px',
          width: 'var(--box-size)',
          height: 'var(--box-size)',
          backgroundColor: 'orange',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support multiple CSS variables in nested inheritance', async () => {
    const svg = await satori(
      <div
        style={{
          '--bg-color': 'lightblue',
          '--text-color': 'darkblue',
          backgroundColor: 'var(--bg-color)',
          color: 'var(--text-color)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            '--bg-color': 'lightgreen',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-color)',
            padding: '10px',
          }}
        >
          Nested
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support CSS variables with border properties', async () => {
    const svg = await satori(
      <div
        style={{
          '--border-color': '#333',
          '--border-width': '5px',
          border: 'solid',
          borderColor: 'var(--border-color)',
          borderWidth: 'var(--border-width)',
          width: '80px',
          height: '80px',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should handle undefined variables with fallback chain', async () => {
    const svg = await satori(
      <div
        style={{
          '--fallback-color': 'pink',
          backgroundColor: 'var(--undefined, var(--fallback-color))',
          width: '100%',
          height: '100%',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support CSS variables with percentage values', async () => {
    const svg = await satori(
      <div
        style={{
          '--container-width': '80%',
          '--container-height': '60%',
          width: 'var(--container-width)',
          height: 'var(--container-height)',
          backgroundColor: 'teal',
        }}
      />,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support CSS variable for text color', async () => {
    const svg = await satori(
      <div
        style={{
          '--theme-color': 'red',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}
      >
        <div
          style={{
            color: 'var(--theme-color)',
            fontSize: '32px',
          }}
        >
          Hello
        </div>
      </div>,
      {
        width: 200,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should support CSS variable for inherited text color', async () => {
    const svg = await satori(
      <div
        style={{
          '--theme-color': 'blue',
          color: 'var(--theme-color)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'white',
        }}
      >
        <div style={{ fontSize: '24px' }}>Parent</div>
        <div
          style={{
            '--theme-color': 'green',
            color: 'var(--theme-color)',
            fontSize: '24px',
          }}
        >
          Child
        </div>
      </div>,
      {
        width: 200,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
