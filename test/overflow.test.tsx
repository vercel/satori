import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

describe('Overflow', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should not show overflowed text', async () => {
    const svg = await satori(
      <div
        style={{
          width: 15,
          height: 15,
          backgroundColor: 'white',
          overflow: 'hidden',
        }}
      >
        Hello
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work with nested border, border-radius, padding', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          border: '10px solid rgba(0,0,0,0.5)',
          borderRadius: '100px 20%',
          display: 'flex',
          overflow: 'hidden',
          background: 'green',
          padding: 5,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
            borderRadius: '0% 60%',
            display: 'flex',
            padding: 5,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '100%', height: '100%', background: 'blue' }}>
            Satori
          </div>
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
