import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('backgroundClip', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render background-clip:text', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontSize: 30,
          flexDirection: 'column',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            backgroundImage: 'linear-gradient(to right, red, green)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          lynn
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should render background-clip:text compatible with transform', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontSize: 30,
          flexDirection: 'column',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            transform: 'translateX(25px)',
            backgroundImage: 'linear-gradient(to right, red, green)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          lynn
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should render background-clip:text compatible with mask', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          fontSize: 30,
          flexDirection: 'column',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            transform: 'translateX(25px)',
            backgroundImage: 'linear-gradient(to right, red, green)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            maskImage: 'linear-gradient(to right, blue, transparent)',
            color: 'transparent',
          }}
        >
          lynn
        </div>
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(toImage(svg)).toMatchImageSnapshot()
  })

  it('should preserve color', async () => {
    const svg = await satori(
      <div
        style={{
          background: 'radial-gradient(#eb10ff, #d700ff)',
          backgroundClip: 'text',
          color: 'green',
          textShadow:
            '0px 0px 5px #ffffff9c,-1px -1px 1px #ffffff9c,1px 0px 5px #c0f,0px -2px 1px #ea2eff00,1px 0px 5px #d325ff,0px -2px 1px #fff,0px 1px 1px #a600f88f,-1px 3px 1px #a600f854',
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

    expect(toImage(svg)).toMatchImageSnapshot()
  })
})
