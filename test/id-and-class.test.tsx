import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('Id and Class', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should preserve id and class attributes', async () => {
    const svg = await satori(
      <div id='test-element' className='class1 class2'></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(svg).toMatchInlineSnapshot(
      '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><g class=\\"class1 class2\\" id=\\"test-element\\"><mask id=\\"satori_om-id\\"><rect x=\\"0\\" y=\\"0\\" width=\\"0\\" height=\\"0\\" fill=\\"#fff\\"/></mask></g></svg>"'
    )
  })
})
