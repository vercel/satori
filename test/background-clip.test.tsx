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

  it('should render WebkitTextFillColor as white over gradient', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: 32,
          fontWeight: 600,
          background:
            'radial-gradient(61.04% 180% at 55.38% 0%, #55f114 6.77%, #02ff44 26.56%, #14f13f 40.1%, #02D7FF 67.71%, #1496f3 67.72%, #02D7FF 100%)',
          backgroundClip: 'text',
          WebkitTextFillColor: '#ffffff',
          color: '#ffffff',
          textShadow:
            '0px 0px 2px #1677f1,0px 0px 3px #1677f1,0px 0px 4px #1677f1,0px 0px 5px #1677f1,0px 0px 5px #1677f1',
        }}
      >
        Hello
      </div>,
      {
        width: 200,
        height: 50,
        fonts,
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should render WebkitTextFillColor transparent as gradient text', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: 32,
          background: 'linear-gradient(90deg, #ff00bc, #6400ff)',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: '#ffffff',
        }}
      >
        Hello
      </div>,
      {
        width: 200,
        height: 50,
        fonts,
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should not render text-shadow when text-fill-color is transparent with background-clip text', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          fontSize: 32,
          background: 'linear-gradient(to right, #d300ea 0%,#00f9f9 100%)',
          backgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          color: '#000000',
          textShadow: '0px -3px -1px #E88AFF, 1px 3px 5px #81dbff',
        }}
      >
        Hello
      </div>,
      {
        width: 200,
        height: 50,
        fonts,
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
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
