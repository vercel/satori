import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

// `space-evenly` is a standard value of both `justify-content` and
// `align-content`, and Yoga implements it (JUSTIFY_SPACE_EVENLY /
// ALIGN_SPACE_EVENLY). It was simply missing from the value maps, so it threw.
//
// The assertions use positions rather than an image snapshot because that is
// what distinguishes this value from `space-around`: two 10px boxes in a 100px
// column land at 27/63 with `space-evenly` (three equal gaps) and at 20/70 with
// `space-around` (half-size gaps at the edges).
describe('space-evenly', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const ys = (svg: string) =>
    [...svg.matchAll(/y="([\d.]+)"/g)].map((m) => m[1])

  it('should support justifyContent: space-evenly', async () => {
    const column = (justifyContent: string) => (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent,
          width: '100%',
          height: '100%',
        }}
      >
        <div
          style={{ display: 'flex', width: 10, height: 10, background: 'red' }}
        />
        <div
          style={{ display: 'flex', width: 10, height: 10, background: 'red' }}
        />
      </div>
    )
    const opts = { width: 100, height: 100, fonts }

    const evenly = await satori(column('space-evenly'), opts)
    expect(ys(evenly)).toContain('27')
    expect(ys(evenly)).toContain('63')

    const around = await satori(column('space-around'), opts)
    expect(ys(around)).toContain('20')
    expect(ys(around)).toContain('70')
  })

  it('should support alignContent: space-evenly', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-evenly',
          width: '100%',
          height: '100%',
        }}
      >
        <div
          style={{ display: 'flex', width: 100, height: 10, background: 'red' }}
        />
        <div
          style={{ display: 'flex', width: 100, height: 10, background: 'red' }}
        />
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(ys(svg)).toContain('27')
    expect(ys(svg)).toContain('63')
  })
})
