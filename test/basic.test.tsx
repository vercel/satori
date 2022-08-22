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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"15.48289183222958\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"red\\"/><text x=\\"0\\" y=\\"15.48289183222958\\" width=\\"36.7734375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">Hello</text></svg>"'
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
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><path fill=\\"black\\" d=\\"M10.1 4.1L10.1 15.5L8.6 15.5L8.6 10.2L2.8 10.2L2.8 15.5L1.3 15.5L1.3 4.1L2.8 4.1L2.8 9.0L8.6 9.0L8.6 4.1L10.1 4.1ZM16.0 15.6L16.0 15.6Q14.3 15.6 13.2 14.5Q12.1 13.4 12.1 11.5L12.1 11.5L12.1 11.2Q12.1 10.0 12.6 9.0Q13.1 8.0 14.0 7.4Q14.8 6.9 15.8 6.9L15.8 6.9Q17.5 6.9 18.4 8.0Q19.3 9.0 19.3 11.1L19.3 11.1L19.3 11.7L13.6 11.7Q13.6 12.9 14.3 13.7Q15.0 14.5 16.1 14.5L16.1 14.5Q16.9 14.5 17.4 14.1Q17.9 13.8 18.3 13.3L18.3 13.3L19.2 14.0Q18.1 15.6 16.0 15.6ZM15.8 8.1L15.8 8.1Q15.0 8.1 14.4 8.7Q13.8 9.3 13.6 10.5L13.6 10.5L17.9 10.5L17.9 10.4Q17.8 9.3 17.3 8.7Q16.7 8.1 15.8 8.1ZM22.5 3.5L22.5 15.5L21.1 15.5L21.1 3.5L22.5 3.5ZM26.4 3.5L26.4 15.5L25.0 15.5L25.0 3.5L26.4 3.5ZM28.4 11.3L28.4 11.2Q28.4 9.9 28.8 8.9Q29.3 8.0 30.2 7.4Q31.1 6.9 32.2 6.9L32.2 6.9Q33.9 6.9 35.0 8.1Q36.1 9.3 36.1 11.2L36.1 11.2L36.1 11.4Q36.1 12.6 35.6 13.6Q35.1 14.5 34.2 15.1Q33.4 15.6 32.2 15.6L32.2 15.6Q30.5 15.6 29.4 14.4Q28.4 13.2 28.4 11.3L28.4 11.3ZM29.8 11.4L29.8 11.4Q29.8 12.8 30.5 13.6Q31.1 14.5 32.2 14.5L32.2 14.5Q33.3 14.5 34.0 13.6Q34.6 12.7 34.6 11.2L34.6 11.2Q34.6 9.8 33.9 8.9Q33.3 8.1 32.2 8.1L32.2 8.1Q31.1 8.1 30.5 8.9Q29.8 9.8 29.8 11.4Z \\"/></svg>"'
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

  it('should support array in JSX children', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: '#ff0',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <div>1</div>
        {[
          <div style={{ display: 'flex' }}>2{[<div>3</div>]}</div>,
          <div style={{ display: 'flex' }}>{[4]}</div>,
        ]}
      </div>,
      {
        width: 100,
        height: 100,
        embedFont: false,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"100\\" fill=\\"#ff0\\"/><text x=\\"0\\" y=\\"15.48289183222958\\" width=\\"8.984375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">1</text><text x=\\"9\\" y=\\"15.48289183222958\\" width=\\"8.984375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">2</text><text x=\\"18\\" y=\\"15.48289183222958\\" width=\\"8.984375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">3</text><text x=\\"27\\" y=\\"15.48289183222958\\" width=\\"8.984375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">4</text></svg>"'
    )
  })
})
