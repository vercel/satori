import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('outline', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const box = { width: 60, height: 50, background: '#eee' }

  it('should draw outlines outside of the border', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          gap: 26,
          padding: 20,
          alignItems: 'flex-start',
        }}
      >
        <div style={{ ...box, outline: '2px solid red' }} />
        <div
          style={{
            ...box,
            outline: '4px dashed blue',
            outlineOffset: 4,
            borderRadius: 10,
          }}
        />
        <div
          style={{
            ...box,
            border: '3px solid black',
            outline: '3px dotted green',
            outlineOffset: -10,
          }}
        />
        <div
          style={{
            ...box,
            outlineWidth: 6,
            outlineStyle: 'double',
            outlineColor: 'purple',
          }}
        />
        <div
          style={{ ...box, outline: 'thick ridge orange', outlineOffset: 2 }}
        />
      </div>,
      { width: 480, height: 90, fonts }
    )
    expect(await toImage(svg, 480)).toMatchImageSnapshot()
  })

  it('should be clipped by ancestors, not by the element', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 20, padding: 10 }}>
        <div
          style={{
            width: 50,
            height: 50,
            overflow: 'hidden',
            background: '#ddd',
            padding: 10,
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              background: 'gold',
              outline: '6px solid red',
            }}
          />
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            margin: 10,
            overflow: 'hidden',
            background: 'gold',
            outline: '6px solid red',
          }}
        >
          <div style={{ width: 60, height: 20, background: 'teal' }} />
        </div>
      </div>,
      { width: 170, height: 90, fonts }
    )
    expect(await toImage(svg, 170)).toMatchImageSnapshot()
  })

  it('should not draw outlines without a style', async () => {
    const svg = await satori(
      <div style={{ padding: 10 }}>
        <div style={{ ...box, outlineWidth: 4, outlineColor: 'red' }} />
        <div style={{ ...box, outline: '4px none red' }} />
      </div>,
      { width: 100, height: 130, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })
})
