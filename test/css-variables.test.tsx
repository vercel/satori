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

  const substitutions = (valid: string) =>
    [
      ['var(--missing)', false],
      ['var(--invalid)', false],
      ['var(--missing,)', false],
      ['env(unknown)', false],
      ['env(unknown,)', false],
      [`var(--missing, ${valid})`, true],
      [`env(unknown, ${valid})`, true],
      ['var(--space)', true],
      ['var(--local)', true],
    ] as const
  const renderStyle = (style: Record<string, string | number>, valid = '8px') =>
    render(
      <div style={{ display: 'flex', '--space': valid }}>
        <div
          style={
            {
              display: 'flex',
              position: 'relative',
              width: 100,
              height: 200,
              background: 'linear-gradient(red, blue)',
              fontSize: 32,
              overflow: 'clip',
              '--invalid': 'initial',
              '--local': valid,
              ...style,
            } as any
          }
        >
          <div style={{ width: 20, height: 20, flexShrink: 0 }}>Spacing</div>
          <div
            style={{ width: 20, height: 20, flexShrink: 0, background: 'blue' }}
          />
        </div>
      </div>,
      { width: 600, height: 300 }
    )

  it.each(['padding', 'margin'])(
    'should unset invalid %s longhands without disturbing other sides or later overrides',
    async (property) => {
      const sides = ['Top', 'Right', 'Bottom', 'Left']
      for (const length of [24, 32]) {
        const before = Object.fromEntries(
          sides.map((side) => [property + side, length])
        )
        for (const side of sides) {
          const longhand = property + side
          for (const [value, valid] of substitutions('8px')) {
            for (const first of [true, false]) {
              const style = first
                ? { [property]: length, [longhand]: value }
                : { [longhand]: value, [property]: length }
              // Chromium computes only the invalid side to 0px.
              expect(await renderStyle(style)).toBe(
                await renderStyle({
                  ...before,
                  [longhand]: first ? (valid ? 8 : 0) : length,
                })
              )
            }
          }
        }
      }
    }
  )

  it.each([
    [
      'borderLeftWidth',
      { border: '12px solid red' },
      { borderLeftWidth: 3 },
      '8px',
    ],
    [
      'borderLeftStyle',
      { border: '12px solid red' },
      { borderLeftStyle: 'none' },
      'dashed',
    ],
    [
      'borderLeft',
      { border: '12px solid red' },
      { borderLeft: 'none' },
      '8px dashed blue',
    ],
    ['left', { inset: '32px', position: 'absolute' }, { left: 'auto' }, '8px'],
    ['columnGap', { gap: 32 }, { columnGap: 0 }, '8px'],
    ['rowGap', { gap: 32, flexDirection: 'column' }, { rowGap: 0 }, '8px'],
    ['padding', { paddingLeft: 32 }, { paddingLeft: 0 }, '8px'],
    ['margin', { marginLeft: 32 }, { marginLeft: 0 }, '8px'],
    [
      'border',
      { borderWidth: 12, borderStyle: 'solid', borderColor: 'red' },
      { borderWidth: 0, borderStyle: 'none', borderColor: 'black' },
      '8px dashed blue',
    ],
    [
      'cornerShape',
      { borderRadius: 24, cornerTopLeftShape: 'bevel' },
      { cornerTopLeftShape: 'round' },
      'bevel',
    ],
    [
      'wordWrap',
      { overflowWrap: 'anywhere' },
      { overflowWrap: 'normal' },
      'normal',
    ],
    [
      'WebkitBackdropFilter',
      { backdropFilter: 'blur(3px)' },
      { backdropFilter: 'none' },
      'contrast(2)',
    ],
    [
      'backdropFilter',
      { WebkitBackdropFilter: 'blur(3px)' },
      { backdropFilter: 'none' },
      'contrast(2)',
    ],
    [
      'WebkitBackgroundClip',
      { backgroundClip: 'text' },
      { backgroundClip: 'border-box' },
      'border-box',
    ],
    [
      'overflowClipMargin',
      { 'overflow-clip-margin': 'content-box 8px' },
      { overflowClipMargin: '0px' },
      'content-box 4px',
    ],
  ] as const)(
    'should unset the expanded output of invalid %s declarations',
    async (property, before, initial, valid) => {
      for (const [value, resolved] of substitutions(valid)) {
        for (const first of [true, false]) {
          const style = first
            ? { ...before, [property]: value }
            : { [property]: value, ...before }
          // Chromium's computed values, including the initial 3px border width.
          const expected = resolved
            ? first
              ? { ...before, [property]: valid }
              : { [property]: valid, ...before }
            : first
            ? { ...before, ...initial }
            : before
          expect(await renderStyle(style, valid)).toBe(
            await renderStyle(expected, valid)
          )
        }
      }
    }
  )

  it.each(['fontSynthesisWeight', 'fontSynthesisStyle'])(
    'should inherit invalid %s after a synthesis shorthand',
    async (property) => {
      for (const inherited of ['weight style', 'none']) {
        const node = (style) => (
          <div style={{ fontSynthesis: inherited }}>
            <span
              style={{
                fontSize: 32,
                fontWeight: 700,
                fontStyle: 'italic',
                ...style,
              }}
            >
              Spacing
            </span>
          </div>
        )
        expect(
          await render(
            node({ fontSynthesis: 'none', [property]: 'var(--missing)' })
          )
        ).toBe(
          await render(
            node({
              fontSynthesis: 'none',
              [property]: inherited === 'none' ? 'none' : 'auto',
            })
          )
        )
      }
    }
  )

  it.each(['maskImage', 'WebkitMaskImage', 'WebkitMask'])(
    'should unset %s after its other spelling',
    async (property) => {
      const other = property === 'maskImage' ? 'WebkitMaskImage' : 'maskImage'
      const box = (style = {}) =>
        render(
          <div style={{ width: 60, height: 60, background: 'red', ...style }} />
        )
      expect(
        await toImage(
          await box({
            [other]: 'linear-gradient(black 50%, transparent 50%)',
            [property]: 'var(--missing)',
          })
        )
      ).toEqual(await toImage(await box()))
    }
  )

  it('should ignore invalid substitutions in unknown properties', async () => {
    for (const property of ['unknownProperty', 'constructor', 'toString']) {
      expect(await renderStyle({ [property]: 'var(--missing)' })).toBe(
        await renderStyle({})
      )
    }
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

  it('should keep values apart from what is next to them', async () => {
    // Minifiers leave out spaces after functions.
    expect(
      await render(
        <div
          style={{
            display: 'flex',
            '--width': '40px',
            '--size': '16px',
            '--leading': '30px',
            '--family': 'sans-serif',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'var(--width)20px',
              padding: 'var(--size)0',
            }}
          >
            <div style={{ font: 'var(--size)/var(--leading)var(--family)' }}>
              Hello
            </div>
            <div style={{ background: 'red' }} />
          </div>
        </div>
      )
    ).toBe(
      await render(
        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '40px 20px',
              padding: '16px 0',
            }}
          >
            <div style={{ font: '16px/30px sans-serif' }}>Hello</div>
            <div style={{ background: 'red' }} />
          </div>
        </div>
      )
    )
  })

  it('should resolve environment variables like on desktops', async () => {
    const box = { display: 'flex', height: 10, background: 'red' }
    expect(
      await render(
        <div style={{ display: 'flex', flexDirection: 'column', width: 80 }}>
          <style>{`.inset { padding-left: max(8px, env(safe-area-inset-left)) }`}</style>
          <div
            style={{
              ...box,
              width: 'calc(50% + max(4px, env(safe-area-inset-right)))',
            }}
          />
          <div style={{ ...box, width: 'env(titlebar-area-width, 30px)' }} />
          <div
            style={{
              ...box,
              '--width': '20px',
              width: 'env(unknown, var(--width))',
            }}
          />
          <div style={{ ...box, width: 10 }}>
            <div style={{ ...box, width: 'env(constructor)' }} />
          </div>
          <div className='inset' style={{ display: 'flex' }}>
            <div style={{ ...box, width: 10 }} />
          </div>
        </div>
      )
    ).toBe(
      await render(
        <div style={{ display: 'flex', flexDirection: 'column', width: 80 }}>
          {/* The same elements, for the same IDs. */}
          <style>{''}</style>
          <div style={{ ...box, width: 'calc(50% + 4px)' }} />
          <div style={{ ...box, width: 30 }} />
          <div style={{ ...box, width: 20 }} />
          <div style={{ ...box, width: 10 }}>
            <div style={box} />
          </div>
          <div style={{ display: 'flex', paddingLeft: 8 }}>
            <div style={{ ...box, width: 10 }} />
          </div>
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
