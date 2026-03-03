import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Margin', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render element with margin shorthand (1 value)', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'red',
            margin: 20,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with margin shorthand (2 values)', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'red',
            margin: '10px 20px',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with margin shorthand (3 values)', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'red',
            margin: '10px 15px 20px',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with margin shorthand (4 values)', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'red',
            margin: '5px 10px 15px 20px',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with individual margin properties', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'blue',
            marginTop: 10,
            marginRight: 15,
            marginBottom: 20,
            marginLeft: 25,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with negative margin', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'lightgray',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            background: 'red',
          }}
        />
        <div
          style={{
            width: 50,
            height: 50,
            background: 'blue',
            marginTop: -20,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render element with negative margin left', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'lightgray',
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            background: 'red',
          }}
        />
        <div
          style={{
            width: 50,
            height: 50,
            background: 'blue',
            marginLeft: -20,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render margin with flexbox column container', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 40,
            height: 20,
            background: 'red',
            margin: 5,
          }}
        />
        <div
          style={{
            width: 40,
            height: 20,
            background: 'blue',
            margin: 5,
          }}
        />
        <div
          style={{
            width: 40,
            height: 20,
            background: 'green',
            margin: 5,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render margin with flexbox row container', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 20,
            height: 40,
            background: 'red',
            margin: 5,
          }}
        />
        <div
          style={{
            width: 20,
            height: 40,
            background: 'blue',
            margin: 5,
          }}
        />
        <div
          style={{
            width: 20,
            height: 40,
            background: 'green',
            margin: 5,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render margin auto horizontally', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'lightgray',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'red',
            margin: '0 auto',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render marginLeft auto', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'lightgray',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'blue',
            marginLeft: 'auto',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render marginRight auto', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'lightgray',
          display: 'flex',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'green',
            marginRight: 'auto',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render margin with different units', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'purple',
            margin: '10px',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render zero margin', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            background: 'orange',
            margin: 0,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render margin collapsing with siblings', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'lightgray',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            width: 80,
            height: 30,
            background: 'red',
            marginBottom: 20,
          }}
        />
        <div
          style={{
            width: 80,
            height: 30,
            background: 'blue',
            marginTop: 10,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render margin with nested elements', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 80,
            height: 80,
            background: 'yellow',
            margin: 10,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              background: 'red',
              margin: 20,
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render margin with positioned elements', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 40,
            height: 40,
            background: 'red',
            margin: 20,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render large margin values', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            background: 'red',
            margin: 40,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render asymmetric margins', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'teal',
            marginTop: 5,
            marginRight: 30,
            marginBottom: 10,
            marginLeft: 15,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render margin with text content', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'lightgray',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontSize: 20,
            background: 'white',
            margin: 10,
          }}
        >
          Hello
        </div>
        <div
          style={{
            fontSize: 20,
            background: 'white',
            margin: 10,
          }}
        >
          World
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
