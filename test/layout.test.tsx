import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Layout', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should stretch items by default', async () => {
    const svg = await satori(
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'blue' }}>x</div>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
