import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

declare module 'react' {
  interface CSSProperties {
    // Allow any CSS variable starting with '--'
    [key: `--${string}`]: string | number
  }
}

describe('CSS Variables', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const render = (node: JSX.Element, options = {}) =>
    satori(node, { width: 100, height: 100, fonts, ...options })

  it('should treat `initial`, `inherit` and missing variables like browsers', async () => {
    const box = { display: 'flex', height: 20 }
    expect(
      await render(
        <div style={{ display: 'flex', flexDirection: 'column', '--c': 'red' }}>
          {/* `initial` is the guaranteed-invalid value, so the fallback is used. */}
          <div
            style={{
              ...box,
              '--c': 'initial',
              backgroundColor: 'var(--c, blue)',
            }}
          />
          {/* Custom properties are inherited. */}
          <div
            style={{ ...box, '--c': 'inherit', backgroundColor: 'var(--c)' }}
          />
          {/* Missing variables make declarations behave as `unset`. */}
          <div style={{ ...box, color: 'green' }}>
            <span style={{ color: 'var(--missing)' }}>A</span>
            <span style={{ width: 'var(--missing)', backgroundColor: 'red' }}>
              B
            </span>
          </div>
        </div>
      )
    ).toBe(
      await render(
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...box, backgroundColor: 'blue' }} />
          <div style={{ ...box, backgroundColor: 'red' }} />
          <div style={{ ...box, color: 'green' }}>
            <span>A</span>
            <span style={{ backgroundColor: 'red' }}>B</span>
          </div>
        </div>
      )
    )
  })

  it('should support empty fallbacks of variables', async () => {
    const box = { display: 'flex', width: 20, height: 20, background: 'red' }
    expect(
      await render(
        <div style={{ display: 'flex', '--b': 'scale(2)' }}>
          <div
            style={{
              ...box,
              transform: 'var(--a,) var(--b,) rotate(45deg)',
            }}
          />
          {/* Like the transforms of Tailwind CSS without its variables. */}
          <div style={{ ...box, transform: 'var(--a,) var(--c,)' }} />
          <div style={{ ...box, translate: 'var(--x) var(--y)' }} />
        </div>
      )
    ).toBe(
      await render(
        <div style={{ display: 'flex' }}>
          <div style={{ ...box, transform: 'scale(2) rotate(45deg)' }} />
          <div style={box} />
          <div style={box} />
        </div>
      )
    )
  })

  it('should resolve variables where they are used', async () => {
    expect(
      await render(
        <div
          style={{
            display: 'flex',
            fontSize: 10,
            '--padding': '16px',
            '--size': '2em',
          }}
        >
          <div
            style={{
              fontSize: 20,
              width: 'calc(100% - var(--padding) * 2)',
              height: 'var(--size)',
              background: 'red',
            }}
          />
        </div>
      )
    ).toBe(
      await render(
        <div style={{ display: 'flex', fontSize: 10 }}>
          <div
            style={{
              fontSize: 20,
              width: 'calc(100% - 32px)',
              height: 40,
              background: 'red',
            }}
          />
        </div>
      )
    )
  })

  it('should report invalid arguments of transform functions', async () => {
    const node = (
      <div
        style={{
          display: 'flex',
          width: 20,
          height: 20,
          background: 'red',
          transform: 'translate3d(initial, 0, 0)',
        }}
      />
    )
    const errors: string[] = []
    expect(
      await render(node, { onStyleError: (e: Error) => errors.push(e.message) })
    ).toBe(
      await render(
        <div
          style={{ display: 'flex', width: 20, height: 20, background: 'red' }}
        />
      )
    )
    expect(errors).toEqual([expect.stringContaining('translate3d')])
    await expect(render(node)).rejects.toThrow('translate3d')
  })

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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
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
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })
})
