import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'
import satori from '../src'

describe('Basic', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render empty div', async () => {
    const svg = await satori(<div></div>, { width: 100, height: 100, fonts })
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"/>"'
    )
  })

  it('should render basic div with text', async () => {
    const svg = await satori(<div>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
      embedFont: false,
    })
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.10789183222958\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
    )
  })

  it('should render basic div with background color', async () => {
    const svg = await satori(
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
    const svg = await satori(
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"red\\"/><text x=\\"0\\" y=\\"14.10789183222958\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
    )
  })

  it('should support embedded fonts', async () => {
    const svg = await satori(<div>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
      embedFont: true,
    })
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path fill=\\"black\\" d=\\"M10.1 2.7L10.1 14.1L8.6 14.1L8.6 8.9L2.8 8.9L2.8 14.1L1.3 14.1L1.3 2.7L2.8 2.7L2.8 7.6L8.6 7.6L8.6 2.7L10.1 2.7ZM16.0 14.3L16.0 14.3Q14.3 14.3 13.2 13.1Q12.1 12.0 12.1 10.1L12.1 10.1L12.1 9.9Q12.1 8.6 12.6 7.6Q13.1 6.6 14.0 6.1Q14.8 5.5 15.8 5.5L15.8 5.5Q17.5 5.5 18.4 6.6Q19.3 7.7 19.3 9.7L19.3 9.7L19.3 10.3L13.6 10.3Q13.6 11.5 14.3 12.3Q15.0 13.1 16.1 13.1L16.1 13.1Q16.9 13.1 17.4 12.8Q17.9 12.5 18.3 11.9L18.3 11.9L19.2 12.6Q18.1 14.3 16.0 14.3ZM15.8 6.7L15.8 6.7Q15.0 6.7 14.4 7.3Q13.8 8.0 13.6 9.1L13.6 9.1L17.9 9.1L17.9 9.0Q17.8 7.9 17.3 7.3Q16.7 6.7 15.8 6.7ZM22.5 2.1L22.5 14.1L21.1 14.1L21.1 2.1L22.5 2.1ZM26.4 2.1L26.4 14.1L25.0 14.1L25.0 2.1L26.4 2.1ZM28.4 9.9L28.4 9.8Q28.4 8.6 28.8 7.6Q29.3 6.6 30.2 6.0Q31.1 5.5 32.2 5.5L32.2 5.5Q33.9 5.5 35.0 6.7Q36.1 7.9 36.1 9.9L36.1 9.9L36.1 10.0Q36.1 11.2 35.6 12.2Q35.1 13.2 34.2 13.7Q33.4 14.3 32.2 14.3L32.2 14.3Q30.5 14.3 29.4 13.1Q28.4 11.9 28.4 9.9L28.4 9.9ZM29.8 10.0L29.8 10.0Q29.8 11.4 30.5 12.2Q31.1 13.1 32.2 13.1L32.2 13.1Q33.3 13.1 34.0 12.2Q34.6 11.4 34.6 9.8L34.6 9.8Q34.6 8.4 33.9 7.5Q33.3 6.7 32.2 6.7L32.2 6.7Q31.1 6.7 30.5 7.5Q29.8 8.4 29.8 10.0Z \\"/></svg>"'
    )
  })

  it('should support hex colors', async () => {
    const svg = await satori(
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
    const svg = await satori(
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
    const svg = await satori(
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
