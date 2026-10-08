import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('visibility', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should hide elements but not visible descendants', async () => {
    const svg = await satori(
      <div style={{ padding: 5, fontSize: 14 }}>
        <div
          style={{
            visibility: 'hidden',
            background: 'red',
            padding: 6,
            border: '2px solid black',
            boxShadow: '0 0 4px black',
            outline: '2px solid blue',
          }}
        >
          <div style={{ visibility: 'visible', background: 'lightgreen' }}>
            visible child
          </div>
          hidden text
        </div>
      </div>,
      { width: 200, height: 70, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should keep the space of hidden inline content', async () => {
    const svg = await satori(
      <p style={{ margin: 5, fontSize: 14 }}>
        Before{' '}
        <span style={{ visibility: 'hidden', background: 'yellow' }}>
          hidden words
        </span>{' '}
        after the gap.
      </p>,
      { width: 300, height: 30, fonts }
    )
    expect(toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should treat collapse as hidden', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 5, padding: 5 }}>
        <div style={{ width: 30, height: 30, background: 'red' }} />
        <div
          style={{
            width: 30,
            height: 30,
            background: 'green',
            visibility: 'collapse',
          }}
        />
        <div style={{ width: 30, height: 30, background: 'blue' }} />
      </div>,
      { width: 120, height: 40, fonts }
    )
    expect(toImage(svg, 120)).toMatchImageSnapshot()
  })
})
