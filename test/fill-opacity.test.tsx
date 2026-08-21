import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Opacity to fill-opacity optimization', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should use fill-opacity for a plain shape without an isolated group', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'red',
          opacity: 0.5,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toContain('fill-opacity="0.5"')
    expect(svg).not.toContain('<g opacity=')
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should keep group opacity when the element has a border', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'red',
          border: '2px solid blue',
          opacity: 0.5,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toContain('<g opacity="0.5">')
    expect(svg).not.toContain('fill-opacity')
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should keep group opacity when the element has a box shadow', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          background: 'red',
          boxShadow: '0 0 4px black',
          opacity: 0.5,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toContain('<g opacity="0.5">')
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should keep group opacity when the element has multiple backgrounds', async () => {
    const svg = await satori(
      <div
        style={{
          width: 50,
          height: 50,
          backgroundColor: 'red',
          backgroundImage: 'linear-gradient(to right, blue, green)',
          opacity: 0.5,
        }}
      />,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toContain('<g opacity="0.5">')
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should use fill-opacity for text without stroke or filter', async () => {
    const svg = await satori(
      <div
        style={{
          fontSize: 40,
          color: 'black',
          opacity: 0.5,
        }}
      >
        Hello
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(svg).toContain('fill-opacity="0.5"')
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should render nested opacity multiplicatively', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          opacity: 0.5,
        }}
      >
        <div
          style={{
            width: 50,
            height: 50,
            background: 'red',
            opacity: 0.5,
          }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(svg).toContain('fill-opacity="0.25"')
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
