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
    expect(toImage(svg, 200)).toMatchImageSnapshot()
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
    expect(toImage(svg, 200)).toMatchImageSnapshot()
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
    expect(toImage(svg, 200)).toMatchImageSnapshot()
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
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
