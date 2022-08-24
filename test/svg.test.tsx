import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'
import satori from '../src'

describe('SVG', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render svg nodes', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg viewBox='0 0 100 100'>
          <circle
            cx='50'
            cy='50'
            r='10'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"blue\\"/><image x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" href=\\"data:image/svg+xml;utf8,%3Csvg viewbox=%220 0 100 100%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2210%22 stroke=%22black%22 stroke-width=%223%22 fill=%22red%22%3E%3C/circle%3E%3C/svg%3E\\" preserveAspectRatio=\\"none\\"/></svg>"'
    )
  })

  it('should render svg attributes correctly', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          viewBox='0 0 100 100'
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='50'
            cy='50'
            r='10'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"blue\\"/><image x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" href=\\"data:image/svg+xml;utf8,%3Csvg viewbox=%220 0 100 100%22 fill=%22yellow%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ccircle cx=%2250%22 cy=%2250%22 r=%2210%22 stroke=%22black%22 stroke-width=%223%22 fill=%22red%22%3E%3C/circle%3E%3C/svg%3E\\" preserveAspectRatio=\\"none\\"/></svg>"'
    )
  })
})
