import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'
import type { SatoriNode } from '../src/index.js'

// `space-evenly` is a standard value of both `justify-content` and
// `align-content`. Yoga implements it (JUSTIFY_SPACE_EVENLY /
// ALIGN_SPACE_EVENLY) but the CSS value maps omitted it, so it threw.
//
// Positions are asserted instead of an image snapshot because that is what
// distinguishes this value from `space-around`: three 20px boxes in a 100px
// column land at 10/40/70 with `space-evenly` (four equal gaps, including
// before the first and after the last item) and at ~6.67/40/73.33 with
// `space-around` (half-size gaps at the edges).
describe('space-evenly', () => {
  let fonts
  initFonts((f) => (fonts = f))

  async function childTops(element: JSX.Element) {
    const nodes: SatoriNode[] = []
    await satori(element, {
      width: 100,
      height: 100,
      fonts,
      onNodeDetected: (node) => {
        nodes.push(node)
      },
    })
    return nodes.slice(1).map((node) => node.top)
  }

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
        <div style={{ width: 20, height: 20, background: 'red' }} />
        <div style={{ width: 20, height: 20, background: 'blue' }} />
        <div style={{ width: 20, height: 20, background: 'green' }} />
      </div>
    )

    const evenly = await childTops(column('space-evenly'))
    expect(evenly).toEqual([10, 40, 70])

    // `space-around` is the usual workaround; it is not the same distribution
    // (half-size gaps at the edges), so the first item sits closer to the
    // start and the last item closer to the end.
    const around = await childTops(column('space-around'))
    expect(around).not.toEqual(evenly)
    expect(around[0]).toBeLessThan(evenly[0])
    expect(around[2]).toBeGreaterThan(evenly[2])
  })

  it('should support alignContent: space-evenly', async () => {
    const svg = (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-evenly',
          width: '100%',
          height: '100%',
        }}
      >
        <div style={{ width: 100, height: 20, background: 'red' }} />
        <div style={{ width: 100, height: 20, background: 'blue' }} />
        <div style={{ width: 100, height: 20, background: 'green' }} />
      </div>
    )

    expect(await childTops(svg)).toEqual([10, 40, 70])
  })
})
