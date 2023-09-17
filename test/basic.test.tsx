import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Basic', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should render empty div', async () => {
    const svg = await satori(<div></div>, { width: 100, height: 100, fonts })
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render basic div with text', async () => {
    const svg = await satori(<div>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
    })
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render basic div with background color', async () => {
    const svg = await satori(
      <div
        style={{ backgroundColor: 'red', width: '100%', height: '100%' }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render basic div with text and background color', async () => {
    const svg = await satori(
      <div style={{ backgroundColor: 'red', width: '100%', height: '100%' }}>
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

  it('should support skipping embedded fonts', async () => {
    const svg = await satori(<div>Hello</div>, {
      width: 100,
      height: 100,
      fonts,
      embedFont: false,
    })
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support hex colors', async () => {
    const svg = await satori(
      <div
        style={{ backgroundColor: '#ff0', width: '100%', height: '100%' }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support array in JSX children', async () => {
    const svg = await satori(
      <div
        style={{
          backgroundColor: '#ff0',
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <div>1</div>
        {[
          <div style={{ display: 'flex' }}>2{[<div>3</div>]}</div>,
          <div style={{ display: 'flex' }}>{[4]}</div>,
        ]}
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should combine textNodes correctly', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          background: 'white',
        }}
      >
        Hi {0} <div>hi</div> {0} {false} {undefined} {0} {null} {0} {true} {'x'}{' '}
        {0}
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
