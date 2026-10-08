import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('display: block', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const render = (element: JSX.Element, width = 100, height = 100) =>
    satori(element, { width, height, fonts })

  it('should stack children vertically and stretch them', async () => {
    const svg = await render(
      <div
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          background: '#eee',
        }}
      >
        <div style={{ height: 20, background: 'red' }} />
        <div style={{ height: 30, background: 'green' }} />
        <div style={{ height: 20, width: 50, background: 'blue' }} />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should collapse the margins of siblings', async () => {
    const svg = await render(
      <div style={{ display: 'block', width: '100%', height: '100%' }}>
        <div style={{ height: 20, marginBottom: 20, background: 'red' }} />
        {/* The gap is 30, not 50. */}
        <div style={{ height: 20, marginTop: 30, background: 'green' }} />
        {/* Negative margins are added to the largest positive one. */}
        <div style={{ height: 20, marginTop: -10, background: 'blue' }} />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should collapse the margins of a parent and its first child', async () => {
    const svg = await render(
      <div
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          background: '#eee',
        }}
      >
        <div
          style={{ display: 'block', paddingBottom: 10, background: 'yellow' }}
        >
          {/* The margin collapses through the parent, so it starts at 20. */}
          <div style={{ height: 20, marginTop: 20, background: 'red' }} />
        </div>
        <div style={{ display: 'block', paddingTop: 1, background: 'yellow' }}>
          {/* Padding prevents the margin from collapsing. */}
          <div style={{ height: 20, marginTop: 10, background: 'blue' }} />
        </div>
        <div style={{ display: 'flex', background: 'yellow' }}>
          {/* Flex containers don't collapse margins with their children. */}
          <div
            style={{
              height: 10,
              marginTop: 10,
              flexGrow: 1,
              background: 'green',
            }}
          />
        </div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should center children with auto margins', async () => {
    const svg = await render(
      <div style={{ display: 'block', width: '100%', height: '100%' }}>
        <div
          style={{
            width: 50,
            height: 20,
            margin: '10px auto',
            background: 'red',
          }}
        />
        <div
          style={{
            width: '40%',
            height: 20,
            marginLeft: 'auto',
            background: 'green',
          }}
        />
        <div
          style={{
            maxWidth: 30,
            height: 20,
            margin: '10px auto 0',
            background: 'blue',
          }}
        />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should resolve percentages against the containing block', async () => {
    const svg = await render(
      <div
        style={{
          display: 'block',
          width: 80,
          height: 80,
          padding: 10,
          background: '#eee',
        }}
      >
        <div style={{ width: '50%', height: '25%', background: 'red' }} />
        <div
          style={{
            width: '100%',
            height: '25%',
            paddingLeft: '50%',
            background: 'green',
          }}
        />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should include padding and borders in the size of children', async () => {
    const svg = await render(
      <div style={{ display: 'block', width: '100%', height: '100%' }}>
        <div
          style={{
            height: 30,
            padding: 5,
            border: '5px solid black',
            background: 'red',
          }}
        />
        <div
          style={{
            boxSizing: 'content-box',
            width: 50,
            height: 20,
            padding: 5,
            border: '5px solid black',
            background: 'green',
          }}
        />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should size to the height of its content', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          width: '100%',
          height: '100%',
          background: '#eee',
        }}
      >
        <div style={{ display: 'block', width: 40, background: 'yellow' }}>
          <div style={{ height: 20, margin: 5, background: 'red' }} />
          <div style={{ height: 20, margin: 5, background: 'green' }} />
        </div>
        <div
          style={{
            display: 'block',
            width: 40,
            padding: 5,
            background: 'yellow',
          }}
        >
          <div style={{ height: 50, background: 'blue' }} />
        </div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should lay out flex children and flex parents', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          gap: 10,
          padding: 10,
        }}
      >
        <div style={{ display: 'block', flexGrow: 1, background: '#eee' }}>
          <div style={{ display: 'flex', height: 30 }}>
            <div style={{ flexGrow: 1, background: 'red' }} />
            <div style={{ flexGrow: 2, background: 'green' }} />
          </div>
          <div style={{ height: 20, background: 'blue' }} />
        </div>
        <div style={{ display: 'block', width: 20, background: 'black' }} />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should wrap text to the width of the block', async () => {
    const svg = await render(
      <div
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          padding: 10,
          fontSize: 14,
          background: '#eee',
        }}
      >
        <div style={{ color: 'red' }}>The quick brown fox jumps.</div>
        <div style={{ color: 'blue', textAlign: 'right' }}>Over the dog.</div>
      </div>,
      100,
      100
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should stack text children', async () => {
    const svg = await render(
      <div
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          fontSize: 14,
          background: '#eee',
        }}
      >
        First line
        <div style={{ height: 10, background: 'red' }} />
        Second line
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should skip children with display: none', async () => {
    const svg = await render(
      <div style={{ display: 'block', width: '100%', height: '100%' }}>
        <div style={{ height: 20, background: 'red' }} />
        <div style={{ display: 'none', height: 20, background: 'black' }} />
        <div style={{ height: 20, background: 'green' }} />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should position absolute children', async () => {
    const svg = await render(
      <div
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          padding: 10,
          background: '#eee',
        }}
      >
        <div style={{ height: 20, background: 'red' }} />
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 30,
            height: 30,
            background: 'blue',
          }}
        />
        <div style={{ height: 20, background: 'green' }} />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
