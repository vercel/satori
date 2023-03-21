import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Dynamic size', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render image with dynamic height', async () => {
    const svg = await satori(
      <div>
        Lorem Ipsum is simply dummy text of the printing and typesetting
        industry.
      </div>,
      { width: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render image with dynamic width', async () => {
    const svg = await satori(
      <div>
        Lorem Ipsum is simply dummy text of the printing and typesetting
        industry.
      </div>,
      {
        height: 25,
        fonts,
      }
    )
    expect(toImage(svg, 300)).toMatchImageSnapshot()
  })
})
