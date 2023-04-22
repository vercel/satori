import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Event', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should trigger the onNodeAdded callback', async () => {
    const nodes = []
    await satori(<div style={{ width: '100%', height: 50 }}>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
      onNodeAdded: (node) => {
        nodes.push(node)
      },
    })
    console.log(nodes)
  })
})
