import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'
import satori from '../src'

describe('Basic', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render empty div', async () => {
    const svg = satori(<div></div>, { width: 100, height: 100, fonts })
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"/>"'
    )
  })

  it('should render basic div with text', async () => {
    const svg = satori(<div>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
      embedFont: false,
    })
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"16.21875\\" width=\\"36.7734375\\" height=\\"22.5\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
    )
  })

  it('should render basic div with background color', async () => {
    const svg = satori(
      <div
        style={{ backgroundColor: 'red', width: '100%', height: '100%' }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"red\\"/></svg>"'
    )
  })

  it('should render basic div with text and background color', async () => {
    const svg = satori(
      <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
        Hello
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        embedFont: false,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"red\\"/><text x=\\"0\\" y=\\"16.21875\\" width=\\"36.7734375\\" height=\\"22.5\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
    )
  })

  it('should support embedded fonts', async () => {
    const svg = satori(<div>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
      embedFont: true,
    })
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path fill=\\"black\\" d=\\"M10.1 4.8L10.1 16.2L8.6 16.2L8.6 11.0L2.8 11.0L2.8 16.2L1.3 16.2L1.3 4.8L2.8 4.8L2.8 9.7L8.6 9.7L8.6 4.8L10.1 4.8ZM16.0 16.4L16.0 16.4Q14.3 16.4 13.2 15.2Q12.1 14.1 12.1 12.2L12.1 12.2L12.1 12.0Q12.1 10.7 12.6 9.7Q13.1 8.7 14.0 8.2Q14.8 7.6 15.8 7.6L15.8 7.6Q17.5 7.6 18.4 8.7Q19.3 9.8 19.3 11.8L19.3 11.8L19.3 12.4L13.6 12.4Q13.6 13.7 14.3 14.4Q15.0 15.2 16.1 15.2L16.1 15.2Q16.9 15.2 17.4 14.9Q17.9 14.6 18.3 14.1L18.3 14.1L19.2 14.7Q18.1 16.4 16.0 16.4ZM15.8 8.8L15.8 8.8Q15.0 8.8 14.4 9.4Q13.8 10.1 13.6 11.2L13.6 11.2L17.9 11.2L17.9 11.1Q17.8 10.0 17.3 9.4Q16.7 8.8 15.8 8.8ZM22.5 4.2L22.5 16.2L21.1 16.2L21.1 4.2L22.5 4.2ZM26.4 4.2L26.4 16.2L25.0 16.2L25.0 4.2L26.4 4.2ZM28.4 12.0L28.4 11.9Q28.4 10.7 28.8 9.7Q29.3 8.7 30.2 8.1Q31.1 7.6 32.2 7.6L32.2 7.6Q33.9 7.6 35.0 8.8Q36.1 10 36.1 12.0L36.1 12.0L36.1 12.1Q36.1 13.3 35.6 14.3Q35.1 15.3 34.2 15.8Q33.4 16.4 32.2 16.4L32.2 16.4Q30.5 16.4 29.4 15.2Q28.4 14.0 28.4 12.0L28.4 12.0ZM29.8 12.1L29.8 12.1Q29.8 13.5 30.5 14.3Q31.1 15.2 32.2 15.2L32.2 15.2Q33.3 15.2 34.0 14.3Q34.6 13.5 34.6 11.9L34.6 11.9Q34.6 10.5 33.9 9.7Q33.3 8.8 32.2 8.8L32.2 8.8Q31.1 8.8 30.5 9.6Q29.8 10.5 29.8 12.1Z \\"/></svg>"'
    )
  })

  it('should support hex colors', async () => {
    const svg = satori(
      <div
        style={{ backgroundColor: '#ff0', width: '100%', height: '100%' }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"#ff0\\"/></svg>"'
    )
  })

  it('should support border radius', async () => {
    const svg = satori(
      <div
        style={{
          borderRadius: '10px',
          background: 'red',
          width: '100%',
          height: '100%',
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"red\\" d=\\"M10,0 h80 a10,10 0 0 1 10,10 v80 a10,10 0 0 1 -10,10 h-80 a10,10 0 0 1 -10,-10 v-80 a10,10 0 0 1 10,-10\\"/></svg>"'
    )
  })

  it('should support border width and color', async () => {
    const svg = satori(
      <div
        style={{
          border: '1px solid',
          width: '100%',
          height: '100%',
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"transparent\\" stroke=\\"black\\" stroke-width=\\"1\\"/></svg>"'
    )
  })
})
