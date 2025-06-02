import { it, describe, expect } from 'vitest'
import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Pixel Font Alignment', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('Should align pixel and hinted fonts with pixel boundaries', async () => {
    const habboFont = readFileSync(join(process.cwd(), 'test/assets/Habbo.ttf'))
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
          fontSize: 16,
          fontFamily: 'Habbo',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '160px',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          <div style={{ lineHeight: '16px', marginBottom: '8px' }}>
            Pixel Perfect Text Aligment Pixel Perfect Text Aligment Pixel
            Perfect Text Aligment Pixel Perfect Text Aligment Pixel Perfect Text
            Aligment
          </div>
          <div style={{ lineHeight: '16px', marginBottom: '8px' }}>
            Pixel Perfect Text Aligment Pixel Perfect Text Aligment Pixel
            Perfect Text Aligment Pixel Perfect Text Aligment Pixel Perfect Text
            Aligment
          </div>
          <div style={{ lineHeight: '16px' }}>Test</div>
        </div>
      </div>,
      {
        width: 200,
        height: 200,
        fonts: [
          {
            name: 'Habbo',
            data: habboFont,
            weight: 400,
            style: 'normal',
          },
        ],
        embedFont: true,
      }
    )

    // Check path coordinates for integer values
    const integerPathCoordinates = (svg.match(/\bd="[^"]*"/g) ?? []).every(
      (pathData) => {
        const coordinates = pathData
          .match(/\bd="([^"]+)"/)?.[1]
          .match(/[-]?\d+(?:\.\d+)?/g)
          .map(Number)

        const nonIntegers = coordinates.filter((v) => !Number.isInteger(v))
        if (nonIntegers.length > 0) {
          console.log('Non-integer coordinates found:', nonIntegers)
        }

        return nonIntegers.length === 0
      }
    )

    expect(integerPathCoordinates).toBe(true)
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
