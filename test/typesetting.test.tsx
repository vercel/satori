import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('typesetting', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should wrap normally', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          fontSize: 18,
          color: 'black',
          wordBreak: 'break-word',
        }}
      >
        A quick brown fox jumps over the lazy dog.
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should wrap normally for special characters', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          fontSize: 18,
          color: 'black',
          wordBreak: 'break-word',
        }}
      >
        {`@A #quick ?brown :fox !jumps -over ~the %lazy ^dog.`}
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
