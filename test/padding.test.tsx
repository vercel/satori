import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Padding', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render element with padding shorthand (1 value)', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'lightblue',
          padding: 20,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with padding shorthand (2 values)', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'lightblue',
          padding: '10px 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with padding shorthand (3 values)', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'lightblue',
          padding: '10px 15px 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with padding shorthand (4 values)', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'lightblue',
          padding: '5px 10px 15px 20px',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with individual padding properties', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'lightgreen',
          paddingTop: 10,
          paddingRight: 15,
          paddingBottom: 20,
          paddingLeft: 5,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'blue',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with text content', async () => {
    const svg = await satori(
      <div
        style={{
          background: 'yellow',
          padding: 20,
          fontSize: 20,
        }}
      >
        Hello World
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with border', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'lightblue',
          padding: 15,
          border: '5px solid red',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'white',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with border-radius', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'lightcoral',
          padding: 10,
          borderRadius: 15,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'white',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render zero padding', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 50,
          height: 50,
          background: 'lightgray',
          padding: 0,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'orange',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with flexbox column container', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 80,
          height: 80,
          background: 'lightblue',
          padding: 10,
        }}
      >
        <div
          style={{
            width: '100%',
            height: 20,
            background: 'red',
          }}
        />
        <div
          style={{
            width: '100%',
            height: 20,
            background: 'blue',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with flexbox row container', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 80,
          height: 80,
          background: 'lightgreen',
          padding: 10,
        }}
      >
        <div
          style={{
            width: 20,
            height: '100%',
            background: 'red',
          }}
        />
        <div
          style={{
            width: 20,
            height: '100%',
            background: 'blue',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render large padding values', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 20,
          height: 20,
          background: 'pink',
          padding: 40,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'purple',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render asymmetric padding', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 50,
          height: 50,
          background: 'lightcyan',
          paddingTop: 5,
          paddingRight: 25,
          paddingBottom: 10,
          paddingLeft: 15,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'teal',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with nested elements', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 80,
          height: 80,
          background: 'lavender',
          padding: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            background: 'violet',
            padding: 10,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'white',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with multiple text lines', async () => {
    const svg = await satori(
      <div
        style={{
          background: 'lightyellow',
          padding: 15,
          fontSize: 16,
          width: 80,
        }}
      >
        This is a text with padding that wraps
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with gradient background', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'linear-gradient(to right, red, blue)',
          padding: 20,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'white',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with box-shadow', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'white',
          padding: 15,
          boxShadow: '5px 5px 10px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'lightblue',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render different padding on each side', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 40,
          height: 40,
          background: 'lightgray',
          paddingTop: 30,
          paddingRight: 10,
          paddingBottom: 5,
          paddingLeft: 20,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'navy',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with opacity', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 60,
          height: 60,
          background: 'blue',
          padding: 20,
          opacity: 0.5,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'yellow',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render padding with transform', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 50,
          height: 50,
          background: 'lightpink',
          padding: 15,
          transform: 'rotate(15deg)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
