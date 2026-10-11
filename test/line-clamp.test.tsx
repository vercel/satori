import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Line Clamp', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('Should work correctly', async () => {
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
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'block',
            lineClamp: 2,
          }}
        >
          lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </div>
        <div
          style={{
            width: '100%',
            display: 'block',
            lineClamp: '2',
          }}
        >
          lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </div>
        <div
          style={{
            width: '100%',
            display: 'block',
            lineClamp: '2 "… (continued)"',
          }}
        >
          lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </div>
        <div
          style={{
            width: '100%',
            display: 'block',
            lineClamp: "2 '… (continued)'",
          }}
        >
          lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should replace custom block ellipsis with default ellipsis when too long', async () => {
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
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'block',
            lineClamp: '2 "… (loooooooooooooooooooooooooog text)"',
          }}
        >
          lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should not work when display is not set to block', async () => {
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
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            lineClamp: 2,
          }}
        >
          lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-align: center`', async () => {
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
        }}
      >
        <div
          style={{
            width: '100%',
            display: 'block',
            fontSize: 32,
            textAlign: 'center',
            lineClamp: 2,
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          Making the Web. Superfast
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should clamp the lines of vertical -webkit-box elements like browsers', async () => {
    const text =
      'This paragraph is clamped to two lines with an ellipsis at the end, no matter how much more text follows it.'
    const clamp = {
      display: '-webkit-box',
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
    } as const
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          padding: 8,
          width: '100%',
          height: '100%',
          background: '#fff',
          fontSize: 14,
        }}
      >
        <div style={{ ...clamp, WebkitLineClamp: 2, background: '#eef' }}>
          {text}
        </div>
        <div
          style={{
            ...clamp,
            WebkitLineClamp: 2,
            width: 200,
            background: '#fee',
          }}
        >
          {text}
        </div>
        <div
          style={{
            ...clamp,
            WebkitLineClamp: 2,
            width: 220,
            textAlign: 'center',
            background: '#eff',
          }}
        >
          {text}
        </div>
        <div
          style={{
            ...clamp,
            WebkitLineClamp: 1,
            width: 196,
            background: '#fef',
          }}
        >
          This paragraph is clamped xxxxxxxx yy
        </div>
        {/* Horizontal boxes are laid out like flex, and aren't clamped. */}
        <div
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 1,
            width: 220,
            background: '#efe',
          }}
        >
          {text}
        </div>
      </div>,
      { width: 300, height: 260, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })
})
