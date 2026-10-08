import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const box = (background: string, style = {}) => (
  <div style={{ width: 30, height: 30, background, ...style }} />
)

describe('order', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should lay out flex and grid items in order', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          padding: 5,
        }}
      >
        <div style={{ display: 'flex', gap: 5 }}>
          {box('red', { order: 2 })}
          {box('green')}
          {box('blue', { order: -1 })}
          {box('gold', { order: 2 })}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '30px 30px 30px',
            gap: 5,
          }}
        >
          {box('red', { order: 1 })}
          {box('green')}
          {box('blue')}
        </div>
      </div>,
      { width: 160, height: 80, fonts }
    )
    expect(toImage(svg, 160)).toMatchImageSnapshot()
  })

  it('should paint flex items in order', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', padding: 5 }}>
        {box('red', { order: 1, marginLeft: -15 })}
        {box('green')}
        {box('blue', { marginLeft: -15 })}
      </div>,
      { width: 100, height: 40, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should throw for non-integer values', async () => {
    await expect(
      satori(<div style={{ display: 'flex', order: 1.5 }} />, {
        width: 100,
        height: 100,
        fonts,
      })
    ).rejects.toThrowError('order')
  })
})
