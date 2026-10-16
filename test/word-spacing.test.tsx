import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Word Spacing', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should add space between words', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', flexDirection: 'column', fontSize: 16 }}>
        <div style={{ wordSpacing: 10 }}>Hello world and more</div>
        <div style={{ wordSpacing: -3 }}>Hello world and more</div>
        {/* Inherited, and relative to the font size. */}
        <div style={{ wordSpacing: '0.5em' }}>
          Hello <b>world</b> and more
        </div>
        <div style={{ display: 'block', width: 150, wordSpacing: 8 }}>
          Wrapping words that go on a line
        </div>
        <div style={{ wordSpacing: 12 }}>non{'\u00a0'}breaking space</div>
      </div>,
      { width: 300, height: 110, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should treat word-spacing normal as no extra spacing', async () => {
    const render = (wordSpacing: string | number) =>
      satori(
        <div style={{ display: 'flex', fontSize: 20, wordSpacing }}>
          Hello, World
        </div>,
        { width: 200, height: 40, fonts }
      )
    expect(await render('normal')).toBe(await render(0))
  })
})
