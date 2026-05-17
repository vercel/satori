import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Font Feature Settings', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('Should work with small caps (smcp)', async () => {
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
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            fontFeatureSettings: '"smcp" 1',
            color: 'black',
          }}
        >
          Small Caps Text
        </div>
      </div>,
      { width: 400, height: 200, fonts, embedFont: true }
    )
    expect(toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('Should work with ligatures disabled', async () => {
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
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            fontFeatureSettings: '"liga" 0',
            color: 'black',
          }}
        >
          fi fl ffi ffl
        </div>
      </div>,
      { width: 400, height: 200, fonts, embedFont: true }
    )
    expect(toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('Should work without font-feature-settings (baseline)', async () => {
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
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            color: 'black',
          }}
        >
          Regular Text fi fl
        </div>
      </div>,
      { width: 400, height: 200, fonts, embedFont: true }
    )
    expect(toImage(svg, 400)).toMatchImageSnapshot()
  })
})
