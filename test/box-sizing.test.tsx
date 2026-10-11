import { it, describe, expect } from 'vitest'

import { toImage } from './utils.js'
import satori from '../src/index.js'

// A 40x20 image, red on the left and blue on the right.
const image =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="20" height="20" fill="#e33"/><rect x="20" width="20" height="20" fill="#33e"/></svg>'
  )

describe('box sizing', () => {
  it('should support border-box', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          backgroundColor: '#e2e2e2',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 50,
            height: 50,
            padding: 10,
            boxSizing: 'border-box',
            backgroundColor: 'purple',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: 'white',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support content-box', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          backgroundColor: '#e2e2e2',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 50,
            height: 50,
            padding: 10,
            boxSizing: 'content-box',
            backgroundColor: 'purple',
          }}
        >
          <div
            style={{
              height: '100%',
              width: '100%',
              backgroundColor: 'white',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should default to content-box, also for images', async () => {
    const box = {
      width: 60,
      height: 40,
      padding: 10,
      border: '5px solid black',
      background: 'orange',
    }
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: 10,
          alignItems: 'flex-start',
        }}
      >
        <div style={box} />
        <div style={{ ...box, boxSizing: 'border-box' }} />
        <img
          src={image}
          width={60}
          style={{ padding: 6, border: '2px solid black' }}
        />
        <img
          src={image}
          width={60}
          style={{
            padding: 6,
            border: '2px solid black',
            boxSizing: 'border-box',
          }}
        />
        <div
          style={{ width: 40, aspectRatio: 1, padding: 5, background: 'teal' }}
        />
      </div>,
      { width: 400, height: 100, fonts: [] }
    )
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })
})
