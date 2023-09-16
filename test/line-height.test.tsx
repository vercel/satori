import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('line-height', () => {
  let fonts
  initFonts((f) => (fonts = f))
  it('should work correctly', async () => {
    const svgs = await Promise.all(
      [1, '1'].map((lineHeight) =>
        satori(
          <div
            style={{
              margin: 0,
              padding: 0,
              fontSize: '30px',
              width: '100px',
              height: '100px',
              background: 'white',
              lineHeight,
            }}
          >
            Hello I am some text that is here.
          </div>,
          { width: 100, height: 100, fonts, embedFont: true }
        )
      )
    )

    svgs.forEach((svg) => {
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
