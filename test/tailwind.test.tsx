import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

// The `tw` prop isn't in the types of React elements.
const tw = (classes: string) => ({ tw: classes } as any)

describe('tw', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should size boxes and draw borders like with Tailwind preflight', async () => {
    const svg = await satori(
      <div {...tw('flex w-full h-full p-4 bg-gray-100')}>
        <div {...tw('w-1/2 h-16 p-4 border-4 border-red-500 bg-white')} />
        <div {...tw('w-1/2 h-16 ml-2 border-b-2 border-blue-500 bg-white')} />
      </div>,
      { width: 300, height: 100, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })
})
