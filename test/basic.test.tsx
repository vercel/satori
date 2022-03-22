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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"16.29635761589404\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"red\\"/><text x=\\"0\\" y=\\"16.29635761589404\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path fill=\\"black\\" d=\\"M10.1 4.9L10.1 16.3L8.6 16.3L8.6 11.0L2.8 11.0L2.8 16.3L1.3 16.3L1.3 4.9L2.8 4.9L2.8 9.8L8.6 9.8L8.6 4.9L10.1 4.9ZM16.0 16.5L16.0 16.5Q14.3 16.5 13.2 15.3Q12.1 14.2 12.1 12.3L12.1 12.3L12.1 12.0Q12.1 10.8 12.6 9.8Q13.1 8.8 14.0 8.2Q14.8 7.7 15.8 7.7L15.8 7.7Q17.5 7.7 18.4 8.8Q19.3 9.9 19.3 11.9L19.3 11.9L19.3 12.5L13.6 12.5Q13.6 13.7 14.3 14.5Q15.0 15.3 16.1 15.3L16.1 15.3Q16.9 15.3 17.4 15.0Q17.9 14.6 18.3 14.1L18.3 14.1L19.2 14.8Q18.1 16.5 16.0 16.5ZM15.8 8.9L15.8 8.9Q15.0 8.9 14.4 9.5Q13.8 10.1 13.6 11.3L13.6 11.3L17.9 11.3L17.9 11.2Q17.8 10.1 17.3 9.5Q16.7 8.9 15.8 8.9ZM22.5 4.3L22.5 16.3L21.1 16.3L21.1 4.3L22.5 4.3ZM26.4 4.3L26.4 16.3L25.0 16.3L25.0 4.3L26.4 4.3ZM28.4 12.1L28.4 12.0Q28.4 10.7 28.8 9.8Q29.3 8.8 30.2 8.2Q31.1 7.7 32.2 7.7L32.2 7.7Q33.9 7.7 35.0 8.9Q36.1 10.1 36.1 12.1L36.1 12.1L36.1 12.2Q36.1 13.4 35.6 14.4Q35.1 15.4 34.2 15.9Q33.4 16.5 32.2 16.5L32.2 16.5Q30.5 16.5 29.4 15.3Q28.4 14.1 28.4 12.1L28.4 12.1ZM29.8 12.2L29.8 12.2Q29.8 13.6 30.5 14.4Q31.1 15.3 32.2 15.3L32.2 15.3Q33.3 15.3 34.0 14.4Q34.6 13.5 34.6 12.0L34.6 12.0Q34.6 10.6 33.9 9.7Q33.3 8.9 32.2 8.9L32.2 8.9Q31.1 8.9 30.5 9.7Q29.8 10.6 29.8 12.2Z \\"/></svg>"'
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
