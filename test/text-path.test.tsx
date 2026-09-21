import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

// Text is rendered as one SVG path per text node. These snapshots pin the
// exact path data so the glyph serializer cannot drift, even by a rounding
// digit, without the change showing up here.
describe('Text path data', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const pathData = (svg: string) =>
    Array.from(svg.matchAll(/<path[^>]* d="([^"]*)"/g), (m) => m[1])

  it('is stable for fractional sizes, offsets and letter spacing', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          paddingLeft: 3.7,
          paddingTop: 1.3,
          fontSize: 17.5,
          letterSpacing: -0.45,
        }}
      >
        <span>Hello, world! ffi -0.4</span>
        <span style={{ fontSize: 9.25, letterSpacing: 2 }}>
          quick brown fox
        </span>
        <span style={{ fontSize: 41, marginLeft: -30.5, marginTop: -24.5 }}>
          WAVE (1.5)
        </span>
      </div>,
      { width: 240, height: 120, fonts }
    )
    const paths = pathData(svg)
    expect(paths).toHaveLength(3)
    expect(paths).toMatchSnapshot()
  })

  it('is stable across a font fallback boundary', async () => {
    const hebrew = await readFile(
      join(process.cwd(), 'test', 'assets', 'NotoSansHebrew-Regular.ttf')
    )
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontSize: 22.5,
          letterSpacing: 1.5,
          marginLeft: -12.25,
        }}
      >
        Hiשלוםthere
      </div>,
      {
        width: 300,
        height: 100,
        fonts: [
          ...fonts,
          { name: 'Noto', data: hebrew, weight: 400, style: 'normal' },
        ],
      }
    )
    const paths = pathData(svg)
    expect(paths).toHaveLength(1)
    expect(paths).toMatchSnapshot()
  })
})
