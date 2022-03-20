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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.4375\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"red\\"/><text x=\\"0\\" y=\\"14.4375\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path fill=\\"black\\" d=\\"M10.1 3.1L10.1 14.4L8.6 14.4L8.6 9.2L2.8 9.2L2.8 14.4L1.3 14.4L1.3 3.1L2.8 3.1L2.8 8.0L8.6 8.0L8.6 3.1L10.1 3.1ZM16.0 14.6L16.0 14.6Q14.3 14.6 13.2 13.5Q12.1 12.3 12.1 10.4L12.1 10.4L12.1 10.2Q12.1 8.9 12.6 7.9Q13.1 6.9 14.0 6.4Q14.8 5.8 15.8 5.8L15.8 5.8Q17.5 5.8 18.4 6.9Q19.3 8 19.3 10.0L19.3 10.0L19.3 10.6L13.6 10.6Q13.6 11.9 14.3 12.6Q15.0 13.4 16.1 13.4L16.1 13.4Q16.9 13.4 17.4 13.1Q17.9 12.8 18.3 12.3L18.3 12.3L19.2 13.0Q18.1 14.6 16.0 14.6ZM15.8 7.0L15.8 7.0Q15.0 7.0 14.4 7.7Q13.8 8.3 13.6 9.4L13.6 9.4L17.9 9.4L17.9 9.3Q17.8 8.2 17.3 7.6Q16.7 7.0 15.8 7.0ZM22.5 2.4L22.5 14.4L21.1 14.4L21.1 2.4L22.5 2.4ZM26.4 2.4L26.4 14.4L25.0 14.4L25.0 2.4L26.4 2.4ZM28.4 10.2L28.4 10.1Q28.4 8.9 28.8 7.9Q29.3 6.9 30.2 6.4Q31.1 5.8 32.2 5.8L32.2 5.8Q33.9 5.8 35.0 7.0Q36.1 8.2 36.1 10.2L36.1 10.2L36.1 10.3Q36.1 11.5 35.6 12.5Q35.1 13.5 34.2 14.0Q33.4 14.6 32.2 14.6L32.2 14.6Q30.5 14.6 29.4 13.4Q28.4 12.2 28.4 10.2L28.4 10.2ZM29.8 10.3L29.8 10.3Q29.8 11.7 30.5 12.6Q31.1 13.4 32.2 13.4L32.2 13.4Q33.3 13.4 34.0 12.6Q34.6 11.7 34.6 10.1L34.6 10.1Q34.6 8.7 33.9 7.9Q33.3 7.0 32.2 7.0L32.2 7.0Q31.1 7.0 30.5 7.9Q29.8 8.7 29.8 10.3Z \\"/></svg>"'
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
