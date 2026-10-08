import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

// A 40x20 image, red on the left and blue on the right.
const image =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="20" height="20" fill="#e33"/><rect x="20" width="20" height="20" fill="#33e"/></svg>'
  )

describe('aspect-ratio', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should size boxes with a ratio', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: 5,
          alignItems: 'flex-start',
        }}
      >
        <div
          style={{ width: 100, aspectRatio: '16 / 9', background: 'orange' }}
        />
        <div
          style={{
            width: 60,
            aspectRatio: 1,
            padding: 10,
            background: 'teal',
          }}
        />
        <div style={{ height: 50, aspectRatio: '2', background: 'pink' }} />
        <img src={image} style={{ width: 60, aspectRatio: '1 / 1' }} />
        <img src={image} style={{ width: 60, aspectRatio: 'auto 1 / 1' }} />
        <div
          style={{ width: 40, aspectRatio: 'auto 1 / 2', background: 'navy' }}
        />
      </div>,
      { width: 500, height: 100, fonts }
    )
    expect(await toImage(svg, 500)).toMatchImageSnapshot()
  })

  it('should transfer sizes in block and grid layout', async () => {
    const svg = await satori(
      <div style={{ padding: 5 }}>
        <div style={{ aspectRatio: '5 / 1', background: 'orange' }} />
        <div
          style={{
            width: '50%',
            aspectRatio: '4 / 1',
            background: 'teal',
            padding: 5,
          }}
        />
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}
        >
          <div style={{ aspectRatio: '3', background: 'pink' }} />
          <div style={{ aspectRatio: '6', background: 'navy' }} />
        </div>
      </div>,
      { width: 300, height: 140, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should keep the ratio of flex items that shrink', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: 5,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ width: 120, aspectRatio: '2', background: 'orange' }} />
        <div style={{ width: 120, aspectRatio: '2', background: 'teal' }} />
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should not shrink flex items below the transferred size', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: 5,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ height: 50, aspectRatio: '2', background: 'pink' }} />
        <div style={{ height: 50, aspectRatio: '2', background: 'purple' }} />
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should transfer stretched sizes of flex items', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 10, padding: 5, height: 80 }}>
        <div style={{ width: 60, aspectRatio: '2', background: 'orange' }} />
        <div style={{ flexGrow: 1, aspectRatio: '4', background: 'teal' }} />
        <div
          style={{
            width: 60,
            aspectRatio: '2',
            padding: 8,
            boxSizing: 'content-box',
            background: 'pink',
          }}
        />
      </div>,
      { width: 300, height: 100, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should throw for invalid ratios', async () => {
    await expect(
      satori(<div style={{ aspectRatio: '16 / x' }} />, {
        width: 100,
        height: 100,
        fonts,
      })
    ).rejects.toThrowError('Invalid aspect ratio')
  })
})
