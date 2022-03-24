import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'
import satori from '../src'

describe('Units', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support %', async () => {
    const svg = await satori(
      <div
        style={{
          width: '30%',
          height: '10%',
          background: 'red',
        }}
      ></div>,
      {
        width: 100,
        height: 200,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"200\\" viewBox=\\"0 0 100 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"30\\" height=\\"20\\" fill=\\"red\\"/></svg>"'
    )
  })

  it('should support em', async () => {
    const svg = await satori(
      <div
        style={{
          width: '2em',
          height: '3em',
          background: 'red',
          fontSize: 12,
        }}
      ></div>,
      {
        width: 100,
        height: 200,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"200\\" viewBox=\\"0 0 100 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"24\\" height=\\"36\\" fill=\\"red\\"/></svg>"'
    )
  })

  it('should support vh and vw', async () => {
    const svg = await satori(
      <div
        style={{
          width: '10vw',
          height: '80vh',
          background: 'red',
        }}
      ></div>,
      {
        width: 120,
        height: 240,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"120\\" height=\\"240\\" viewBox=\\"0 0 120 240\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"12\\" height=\\"192\\" fill=\\"red\\"/></svg>"'
    )
  })

  it('should support rem', async () => {
    const svg = await satori(
      <div
        style={{
          width: '2rem',
          height: '3rem',
          background: 'red',
          fontSize: 12,
        }}
      ></div>,
      {
        width: 100,
        height: 200,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"200\\" viewBox=\\"0 0 100 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"32\\" height=\\"48\\" fill=\\"red\\"/></svg>"'
    )
  })

  it('should support px and numbers', async () => {
    const svg = await satori(
      <div
        style={{
          width: '20px',
          height: 30,
          background: 'red',
          fontSize: 12,
        }}
      ></div>,
      {
        width: 100,
        height: 200,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"200\\" viewBox=\\"0 0 100 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"20\\" height=\\"30\\" fill=\\"red\\"/></svg>"'
    )
  })

  it('should support radial-gradient', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: 'white',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)',
          backgroundSize: '100px 100px',
          height: '100%',
          width: '100%',
          display: 'flex',
          textAlign: 'center',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          flexWrap: 'nowrap',
        }}
      ></div>,
      {
        width: 100,
        height: 200,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"200\\" viewBox=\\"0 0 100 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><pattern id=\\"satori_pattern_id_0\\" x=\\"0\\" y=\\"0\\" width=\\"100%\\" height=\\"100%\\" patternUnits=\\"userSpaceOnUse\\"><radialGradient id=\\"satori_radial_id_0\\"><stop offset=\\"0\\" stop-color=\\"lightgray\\"/><stop offset=\\"0.02\\" stop-color=\\"lightgray\\"/><stop offset=\\"0\\" stop-color=\\"transparent\\"/><stop offset=\\"1\\" stop-color=\\"transparent\\"/></radialGradient><circle cx=\\"25\\" cy=\\"25\\" width=\\"100\\" height=\\"100\\" r=\\"106.06601717798213\\" fill=\\"url(#satori_radial_id_0)\\"/></pattern><pattern id=\\"satori_pattern_id_1\\" x=\\"0\\" y=\\"0\\" width=\\"100%\\" height=\\"100%\\" patternUnits=\\"userSpaceOnUse\\"><radialGradient id=\\"satori_radial_id_1\\"><stop offset=\\"0\\" stop-color=\\"lightgray\\"/><stop offset=\\"0.02\\" stop-color=\\"lightgray\\"/><stop offset=\\"0\\" stop-color=\\"transparent\\"/><stop offset=\\"1\\" stop-color=\\"transparent\\"/></radialGradient><circle cx=\\"75\\" cy=\\"75\\" width=\\"100\\" height=\\"100\\" r=\\"106.06601717798213\\" fill=\\"url(#satori_radial_id_1)\\"/></pattern></defs><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"200\\" fill=\\"white\\"/><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"200\\" fill=\\"url(#satori_pattern_id_0)\\"/><rect x=\\"0\\" y=\\"0\\" width=\\"100\\" height=\\"200\\" fill=\\"url(#satori_pattern_id_1)\\"/></svg>"'
    )
  })
})
