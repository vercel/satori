import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Overflow', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should not show overflowed text', async () => {
    const svg = await satori(
      <div
        style={{
          width: 15,
          height: 15,
          backgroundColor: 'white',
          overflow: 'hidden',
        }}
      >
        Hello
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work with nested border, border-radius, padding', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          border: '10px solid rgba(0,0,0,0.5)',
          borderRadius: '100px 20%',
          display: 'flex',
          overflow: 'hidden',
          background: 'green',
          padding: 5,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'red',
            borderRadius: '0% 60%',
            display: 'flex',
            padding: 5,
            overflow: 'hidden',
          }}
        >
          <div style={{ width: '100%', height: '100%', background: 'blue' }}>
            Satori
          </div>
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should work with ellipsis, nowrap', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: 'white',
          fontSize: 60,
          fontWeight: 400,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 450,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {'LuciNyan 1 2 345'}
          </div>
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {'LuciNyan 1 2 345 6'}
          </div>
        </div>
      </div>,
      { width: 450, height: 450, fonts, embedFont: true }
    )
    expect(toImage(svg, 450)).toMatchImageSnapshot()
  })

  it("should not work when overflow is not 'hidden' and overflow property should not be inherited", async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          backgroundColor: 'white',
          fontSize: 60,
          fontWeight: 400,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 450,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
            }}
          >
            {'LuciNyan 1 2 345'}
          </div>
          <div
            style={{
              width: 450,
              textOverflow: 'ellipsis',
            }}
          >
            {'LuciNyan 1 2 345 6'}
          </div>
        </div>
      </div>,
      { width: 450, height: 450, fonts, embedFont: true }
    )
    expect(toImage(svg, 450)).toMatchImageSnapshot()
  })
})
