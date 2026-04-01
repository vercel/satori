import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('mix-blend-mode', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support mix-blend-mode multiply', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'blue',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            background: 'red',
            mixBlendMode: 'multiply',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toContain('mix-blend-mode:multiply')
  })

  it('should apply mix-blend-mode to images', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'blue',
        }}
      >
        <img
          src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=='
          style={{
            width: 50,
            height: 50,
            mixBlendMode: 'multiply',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toContain('mix-blend-mode:multiply')
  })

  it('should combine mix-blend-mode with filter', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'blue',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            background: 'red',
            mixBlendMode: 'multiply',
            filter: 'blur(2px)',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toContain('filter:blur(2px)')
    expect(svg).toContain('mix-blend-mode:multiply')
  })

  it('should not add mix-blend-mode when not specified', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'blue',
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            background: 'red',
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(svg).not.toContain('mix-blend-mode')
  })
})
