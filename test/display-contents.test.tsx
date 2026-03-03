import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Display Contents', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render display: contents', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'lightgray',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'contents',
          }}
        >
          <div
            style={{
              width: 50,
              height: 30,
              background: 'red',
            }}
          />
          <div
            style={{
              width: 50,
              height: 30,
              background: 'blue',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should treat display: contents children as direct children of parent', async () => {
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
        <div style={{ width: 20, height: 20, background: 'red' }} />
        <div style={{ display: 'contents' }}>
          <div style={{ width: 20, height: 20, background: 'blue' }} />
          <div style={{ width: 20, height: 20, background: 'green' }} />
        </div>
        <div style={{ width: 20, height: 20, background: 'yellow' }} />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should ignore padding and margin on display: contents elements', async () => {
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
            display: 'contents',
            padding: 20,
            margin: 20,
            border: '10px solid red',
          }}
        >
          <div
            style={{
              width: 50,
              height: 30,
              background: 'purple',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work with nested display: contents', async () => {
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
        <div style={{ display: 'contents' }}>
          <div style={{ display: 'contents' }}>
            <div style={{ width: 50, height: 20, background: 'red' }} />
            <div style={{ width: 50, height: 20, background: 'blue' }} />
          </div>
          <div style={{ width: 50, height: 20, background: 'green' }} />
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should apply flex properties to grandchildren through display: contents', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: 100,
          height: 100,
          background: 'lightgray',
        }}
      >
        <div style={{ display: 'contents' }}>
          <div style={{ width: 20, height: 20, background: 'red' }} />
          <div style={{ width: 20, height: 20, background: 'blue' }} />
          <div style={{ width: 20, height: 20, background: 'green' }} />
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work with text children', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 100,
          height: 100,
          background: 'lightgray',
          fontSize: 16,
        }}
      >
        <div style={{ display: 'contents' }}>
          <div style={{ background: 'white' }}>Hello</div>
          <div style={{ background: 'yellow' }}>World</div>
        </div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
