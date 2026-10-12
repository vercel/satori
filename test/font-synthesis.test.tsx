import { it, describe, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { toImage } from './utils.js'
import satori, { type SatoriOptions } from '../src/index.js'

describe('font synthesis', () => {
  let regular: SatoriOptions['fonts']
  let withBold: SatoriOptions['fonts']

  beforeAll(async () => {
    const asset = (name: string) =>
      readFile(join(process.cwd(), 'test', 'assets', name))
    const roboto = {
      name: 'Roboto',
      data: await asset('Roboto-Regular.ttf'),
      weight: 400,
      style: 'normal',
    } as const
    regular = [roboto]
    withBold = [
      roboto,
      {
        name: 'Roboto',
        data: await asset('Roboto-Bold.ttf'),
        weight: 700,
        style: 'normal',
      },
    ]
  })

  const container = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    width: '100%',
    height: '100%',
    padding: 10,
    boxSizing: 'border-box',
    backgroundColor: 'white',
    fontSize: 24,
  } as const

  it('should synthesize bold and italic when the font has none', async () => {
    const svg = await satori(
      <div style={container}>
        <div>Regular 400</div>
        <div style={{ fontWeight: 500 }}>Not synthesized 500</div>
        <div style={{ fontWeight: 600 }}>Synthetic bold 600</div>
        <div style={{ fontWeight: 700, fontSize: 48 }}>Bold 700</div>
        <div style={{ fontStyle: 'italic' }}>Synthetic italic</div>
        <div style={{ fontWeight: 700, fontStyle: 'italic' }}>
          Bold and italic
        </div>
      </div>,
      { width: 320, height: 300, fonts: regular }
    )
    expect(await toImage(svg, 320)).toMatchImageSnapshot()
  })

  it('should use bold fonts and follow `fontSynthesis`', async () => {
    const svg = await satori(
      <div style={container}>
        <div style={{ fontWeight: 700 }}>Bold font 700</div>
        <div style={{ fontWeight: 900 }}>Bold font 900</div>
        <div style={{ fontWeight: 700, fontSynthesis: 'none' } as any}>
          <span style={{ fontFamily: 'Regular' }}>No synthesis</span>
        </div>
        <div style={{ fontStyle: 'italic', fontSynthesis: 'weight' } as any}>
          No italic
        </div>
        <div style={{ fontStyle: 'oblique 20deg' as any }}>Oblique</div>
        <div style={{ display: 'block' }}>
          Inline <span style={{ fontWeight: 700 }}>bold</span> and{' '}
          <span style={{ fontStyle: 'italic' }}>italic</span> text
        </div>
      </div>,
      {
        width: 320,
        height: 250,
        fonts: [
          ...withBold,
          { ...regular[0], name: 'Regular' },
        ] as SatoriOptions['fonts'],
      }
    )
    expect(await toImage(svg, 320)).toMatchImageSnapshot()
  })
})
