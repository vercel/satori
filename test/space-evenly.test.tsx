import { it, describe, expect } from 'vitest'
import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('space-evenly (issue #780)', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should accept justifyContent space-evenly without throwing', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-evenly',
          width: 100,
          height: 40,
          background: 'white',
        }}
      >
        <div style={{ width: 20, height: 20, background: 'red' }} />
        <div style={{ width: 20, height: 20, background: 'blue' }} />
      </div>,
      { width: 100, height: 40, fonts }
    )
    expect(typeof svg).toBe('string')
    expect(svg.length).toBeGreaterThan(0)
  })

  it('should accept alignContent space-evenly without throwing', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-evenly',
          width: 100,
          height: 100,
          background: 'white',
        }}
      >
        <div style={{ width: 60, height: 20, background: 'red' }} />
        <div style={{ width: 60, height: 20, background: 'blue' }} />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(typeof svg).toBe('string')
  })
})
