import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('text-wrap', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should wrap normally with text-wrap: wrap', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          fontSize: 18,
          color: 'red',
          // @ts-ignore: This isn't a valid CSS property supported by browsers yet.
          textWrap: 'wrap',
        }}
      >
        {'a a a a a a a a'}
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should wrap balancedly with text-wrap: balance', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          fontSize: 18,
          color: 'red',
          // @ts-ignore: This isn't a valid CSS property supported by browsers yet.
          textWrap: 'balance',
        }}
      >
        {'a a a a a a a a'}
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
