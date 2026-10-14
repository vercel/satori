import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Basic', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render empty div', async () => {
    const svg = await satori(<div></div>, { width: 100, height: 100, fonts })
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render basic div with text', async () => {
    const svg = await satori(<div>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
    })
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render basic div with background color', async () => {
    const svg = await satori(
      <div
        style={{ backgroundColor: 'red', width: '100%', height: '100%' }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render basic div with text and background color', async () => {
    const svg = await satori(
      <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
        Hello
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support skipping embedded fonts', async () => {
    const svg = await satori(<div>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
      embedFont: false,
    })
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support hex colors', async () => {
    const svg = await satori(
      <div
        style={{ backgroundColor: '#ff0', width: '100%', height: '100%' }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support array in JSX children', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: '#ff0',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <div>1</div>
        {[
          <div style={{ display: 'flex' }}>2{[<div>3</div>]}</div>,
          <div style={{ display: 'flex' }}>{[4]}</div>,
        ]}
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support custom components', async () => {
    function MyComponent() {
      return <h1 style={{ fontSize: 16 }}>Hello from My Component</h1>
    }

    const svg = await satori(
      <div
        style={{
          backgroundColor: '#ff0',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <MyComponent />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()

    async function MyAsyncComponent() {
      await new Promise((resolve) => setTimeout(resolve, 0))
      return <h1 style={{ fontSize: 16 }}>Hello from My Async Component</h1>
    }
    const svg2 = await satori(
      <div
        style={{
          backgroundColor: '#ff0',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        {/* @ts-ignore */}
        <MyAsyncComponent />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg2, 100)).toMatchImageSnapshot()
  })

  it('should combine textNodes correctly', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          background: 'white',
        }}
      >
        Hi {0} <div>hi</div> {0} {false} {undefined} {0} {null} {0} {true} {'x'}{' '}
        {0}
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should respect points scale factor', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          backgroundColor: 'white',
          height: '300px',
          width: '100%',
        }}
      >
        <div
          style={{
            top: '0.666px',
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: 'red',
              borderWidth: '0.5px',
              borderStyle: 'solid',
              borderColor: 'blue',
            }}
          ></div>
          <div
            style={{
              width: '100px',
              height: '100px',
              backgroundColor: 'red',
              borderWidth: '0.5px',
              borderStyle: 'solid',
              borderColor: 'blue',
            }}
          ></div>
        </div>
      </div>,
      {
        width: 100,
        height: 300,
        fonts,
        pointScaleFactor: 2,
      }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should size text with the points scale factor', async () => {
    // The size of text in a flex item and in a block container.
    const sizes = async (pointScaleFactor: number) => {
      const result: Record<string, number[]> = {}
      await satori(
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex' }}>
            <div key='flex' style={{ display: 'flex' }}>
              Get Started
            </div>
          </div>
          <div style={{ display: 'flex' }}>
            <div
              key='block'
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Get Started
            </div>
          </div>
        </div>,
        {
          width: 200,
          height: 100,
          fonts,
          pointScaleFactor,
          onNodeDetected: ({ key, width, height }) => {
            if (key) result[key] = [width, height]
          },
        }
      )
      return result
    }
    const [exact, half, whole] = await Promise.all([0, 2, 1].map(sizes))
    for (const key of ['flex', 'block']) {
      // Without rounding, text is as wide as it is.
      expect(exact[key][0]).toBeLessThan(whole[key][0])
      expect(whole[key][0]).toBe(Math.ceil(exact[key][0]))
      expect(half[key][0]).toBe(Math.ceil(exact[key][0] * 2) / 2)
      // It still fits in one line.
      expect(exact[key][1]).toBe(whole[key][1])
    }

    // Layouts that aren't rounded are less precise, which made text that
    // fits overflow.
    for (const fontSize of [10, 10.1, 10.3, 11]) {
      const render = (textOverflow: string) =>
        satori(
          <div style={{ display: 'flex' }}>
            <div style={{ display: 'flex', paddingLeft: 12, paddingRight: 12 }}>
              <span
                style={{
                  display: 'inline-block',
                  paddingLeft: 6,
                  paddingRight: 6,
                  overflow: 'hidden',
                  textOverflow,
                  whiteSpace: 'nowrap',
                  fontSize,
                  letterSpacing: -0.15,
                }}
              >
                Get Started
              </span>
            </div>
          </div>,
          { width: 200, height: 40, fonts, pointScaleFactor: 0 }
        )
      expect(await render('ellipsis')).toBe(await render('clip'))
    }
  })

  // https://github.com/vercel/satori/issues/746
  it('should render text matching Object.prototype property names as glyphs, not images', async () => {
    for (const word of [
      'constructor',
      'toString',
      'valueOf',
      'hasOwnProperty',
      '__proto__',
    ]) {
      const svg = await satori(<div>{word}</div>, {
        width: 200,
        height: 50,
        fonts,
      })
      expect(svg).not.toMatch(/<image\b/)
      expect(svg).toMatch(/<path\b/)
    }
  })

  it('should ignore undefined and null style values', async () => {
    const style = { width: 10, height: 10, background: 'red' }
    const expected = await satori(<div style={style} />, {
      width: 10,
      height: 10,
      fonts,
    })
    const svg = await satori(
      <div style={{ ...style, color: undefined, margin: null as any }} />,
      { width: 10, height: 10, fonts }
    )
    expect(svg).toBe(expected)
  })
})
