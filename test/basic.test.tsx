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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"red\\"/><text x=\\"0\\" y=\\"14.84375\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path fill=\\"black\\" d=\\"M10.1 3.5L10.1 14.8L8.6 14.8L8.6 9.6L2.8 9.6L2.8 14.8L1.3 14.8L1.3 3.5L2.8 3.5L2.8 8.4L8.6 8.4L8.6 3.5L10.1 3.5ZM16.0 15L16.0 15Q14.3 15 13.2 13.9Q12.1 12.7 12.1 10.9L12.1 10.9L12.1 10.6Q12.1 9.3 12.6 8.3Q13.1 7.4 14.0 6.8Q14.8 6.2 15.8 6.2L15.8 6.2Q17.5 6.2 18.4 7.3Q19.3 8.4 19.3 10.4L19.3 10.4L19.3 11.0L13.6 11.0Q13.6 12.3 14.3 13.1Q15.0 13.8 16.1 13.8L16.1 13.8Q16.9 13.8 17.4 13.5Q17.9 13.2 18.3 12.7L18.3 12.7L19.2 13.4Q18.1 15 16.0 15ZM15.8 7.4L15.8 7.4Q15.0 7.4 14.4 8.1Q13.8 8.7 13.6 9.8L13.6 9.8L17.9 9.8L17.9 9.7Q17.8 8.6 17.3 8.0Q16.7 7.4 15.8 7.4ZM22.5 2.8L22.5 14.8L21.1 14.8L21.1 2.8L22.5 2.8ZM26.4 2.8L26.4 14.8L25.0 14.8L25.0 2.8L26.4 2.8ZM28.4 10.6L28.4 10.5Q28.4 9.3 28.8 8.3Q29.3 7.3 30.2 6.8Q31.1 6.2 32.2 6.2L32.2 6.2Q33.9 6.2 35.0 7.4Q36.1 8.6 36.1 10.6L36.1 10.6L36.1 10.7Q36.1 11.9 35.6 12.9Q35.1 13.9 34.2 14.5Q33.4 15 32.2 15L32.2 15Q30.5 15 29.4 13.8Q28.4 12.6 28.4 10.6L28.4 10.6ZM29.8 10.7L29.8 10.7Q29.8 12.1 30.5 13.0Q31.1 13.8 32.2 13.8L32.2 13.8Q33.3 13.8 34.0 13.0Q34.6 12.1 34.6 10.5L34.6 10.5Q34.6 9.1 33.9 8.3Q33.3 7.4 32.2 7.4L32.2 7.4Q31.1 7.4 30.5 8.3Q29.8 9.1 29.8 10.7Z \\"/></svg>"'
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
