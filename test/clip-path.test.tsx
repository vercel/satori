import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('clipPath', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render clip-path', async () => {
    const svgs = await Promise.all(
      [
        'circle(20px)',
        'circle(20% at bottom left)',
        'ellipse(10px 0.625em at 10% 20%)',
        'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
        `path('M 0 200 L 0,75 A 5,5 0,0,1 150,75 L 200 200 z')`,
        'inset(10px 20px)',
        'inset(0.5rem round 20% 1em 1rem 2px)',
      ].map((clipPath) =>
        satori(
          <div
            style={{
              height: '100%',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              clipPath,
              fontSize: 32,
              fontWeight: 600,
            }}
          >
            <div style={{ marginTop: 40 }}>Hello, World</div>
          </div>,
          {
            width: 100,
            height: 100,
            fonts,
          }
        )
      )
    )

    svgs.forEach((svg) => expect(toImage(svg)).toMatchImageSnapshot())
  })

  it('should make clip-path compatible with overflow', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          overflow: 'hidden',
          clipPath: 'circle(60px)',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div>Lynnnnnnnnnnnnnnnnnnnnn</div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should respect the position value', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          clipPath: 'circle(30px at 20px 30%)',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div>Lynnnnnnnnnnnnnnnnnnnnn</div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should respect left and top', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ee7621',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            height: 20,
            width: 20,
            clipPath: 'circle(5px at 5px 5px)',
            background: 'red',
          }}
        ></div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })
})
