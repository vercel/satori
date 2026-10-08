import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const box = (background: string, style = {}) => (
  <div style={{ width: 30, height: 30, background, ...style }} />
)

describe('place-*', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should set the alignment on both axes', async () => {
    const container = {
      display: 'grid',
      width: 90,
      height: 90,
      background: '#eee',
    } as const
    const svg = await satori(
      <div style={{ display: 'flex', gap: 10, padding: 5 }}>
        <div style={{ ...container, placeItems: 'end center' }}>
          {box('red')}
        </div>
        <div
          style={{
            ...container,
            gridTemplateColumns: '30px 30px',
            gridTemplateRows: '30px',
            placeContent: 'space-between',
          }}
        >
          {box('green')}
          {box('blue')}
        </div>
        <div style={container}>
          {box('purple', { placeSelf: 'center end' })}
        </div>
      </div>,
      { width: 310, height: 100, fonts }
    )
    expect(toImage(svg, 310)).toMatchImageSnapshot()
  })
})
