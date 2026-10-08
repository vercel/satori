import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Border', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('border', () => {
    it('should support the shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-color', () => {
    it('should render black border by default', async () => {
      const svg = await satori(
        <div
          style={{ border: '1px solid', width: '50%', height: '50%' }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should fallback border color to the current color', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            color: 'red',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support specifying `borderColor`', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px',
            borderColor: 'green',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support overriding borderColor', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px blue',
            borderColor: 'red',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-width', () => {
    it('should render border inside the shape', async () => {
      const svg = await satori(
        <div
          style={{ border: '5px solid black', width: 50, height: 50 }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-style', () => {
    it('should support dashed border', async () => {
      const svg = await satori(
        <div
          style={{ border: '5px dashed black', width: 50, height: 50 }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-style values', () => {
    const row = (lineStyle: string) => (
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 4,
          alignItems: 'flex-start',
        }}
      >
        {[1, 2, 3, 6, 10].map((width) => (
          <div
            style={{
              width: 56,
              height: 34,
              border: `${width}px ${lineStyle} #3366cc`,
            }}
          />
        ))}
        <div
          style={{
            width: 56,
            height: 34,
            border: `8px ${lineStyle} #3366cc`,
            borderRadius: 14,
          }}
        />
        <div
          style={{ width: 56, height: 34, border: `8px ${lineStyle} black` }}
        />
        <div
          style={{
            width: 56,
            height: 34,
            border: `8px ${lineStyle} white`,
            background: '#ccc',
          }}
        />
      </div>
    )

    for (const lineStyle of [
      'dotted',
      'dashed',
      'double',
      'groove',
      'ridge',
      'inset',
      'outset',
    ]) {
      it(`should support ${lineStyle} borders`, async () => {
        const svg = await satori(row(lineStyle), {
          width: 540,
          height: 54,
          fonts,
        })
        expect(toImage(svg, 540)).toMatchImageSnapshot()
      })
    }

    it('should support styles, widths and colors per side', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: 6,
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              width: 90,
              height: 60,
              borderWidth: 8,
              borderStyle: 'solid dotted double dashed',
              borderColor: 'red green blue orange',
            }}
          />
          <div
            style={{
              width: 90,
              height: 60,
              borderWidth: 'thin medium thick 7px',
              borderStyle: 'solid',
              borderColor: 'black',
            }}
          />
          <div
            style={{
              width: 90,
              height: 60,
              border: '6px groove gold',
              borderRadius: 20,
            }}
          />
        </div>,
        { width: 340, height: 74, fonts }
      )
      expect(toImage(svg, 340)).toMatchImageSnapshot()
    })

    it('should not draw or lay out borders without a style', async () => {
      const svg = await satori(
        <div style={{ display: 'flex', background: '#eee' }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderWidth: 10,
              borderStyle: 'none',
              background: 'teal',
            }}
          />
          <div
            style={{
              width: 40,
              height: 40,
              border: '10px hidden red',
              background: 'pink',
            }}
          />
          <div
            style={{
              width: 40,
              height: 40,
              border: '10px solid red',
              borderLeftStyle: 'none',
              background: 'gold',
            }}
          />
        </div>,
        { width: 120, height: 40, fonts }
      )
      expect(toImage(svg, 120)).toMatchImageSnapshot()
    })

    it('should throw for invalid styles', async () => {
      await expect(
        satori(<div style={{ border: '1px wavy red' }} />, {
          width: 100,
          height: 100,
          fonts,
        })
      ).rejects.toThrowError('Invalid value')
      await expect(
        satori(<div style={{ borderStyle: 'solid wavy' }} />, {
          width: 100,
          height: 100,
          fonts,
        })
      ).rejects.toThrowError('Invalid line style')
    })
  })

  describe('border-radius', () => {
    it('should support the shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: '10px',
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support radius for a certain corner', async () => {
      const svg = await satori(
        <div
          style={{
            borderTopRightRadius: '50px',
            borderTopLeftRadius: '10px',
            borderBottomLeftRadius: '60px',
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should not exceed the length of the short side', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: 100,
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 50,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support percentage border radius', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: '100% 10px',
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 50,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support vw vh em and rem units', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            fontSize: '8px',
          }}
        >
          <div
            style={{
              borderRadius: '50vw 25vh 1em 1rem',
              background: 'red',
              width: '100%',
              height: '100%',
            }}
          ></div>
        </div>,
        {
          width: 100,
          height: 50,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support slash and 2-value corner', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            fontSize: '8px',
          }}
        >
          <div
            style={{
              borderRadius: '50px 25% / 10px 20px',
              borderTopLeftRadius: '10px 50px',
              background: 'red',
              width: '100%',
              height: '100%',
            }}
          ></div>
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

  describe('directional', () => {
    it('should support directional border', async () => {
      const svg = await satori(
        <div
          style={{
            borderTop: '1px solid red',
            borderRight: '2px solid green',
            borderBottom: '3px solid blue',
            borderLeft: '4px solid yellow',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support non-complete border', async () => {
      const svg = await satori(
        <div
          style={{
            borderTop: '10px solid red',
            borderBottom: '5px dashed blue',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support advanced border with radius', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: '10px 20%',
            borderTopLeftRadius: '10px 25px',
            borderTop: '10px solid red',
            borderBottom: '5px dashed blue',
            borderLeft: '2px solid yellow',
            borderRight: '5px dashed blue',
            background: 'gray',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should join sides with different colors diagonally', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            padding: 5,
            width: '100%',
            height: '100%',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderWidth: 12,
              borderStyle: 'solid',
              borderColor: 'red green blue orange',
            }}
          />
          <div
            style={{
              width: 40,
              height: 40,
              borderStyle: 'solid',
              borderColor: 'red red blue blue',
              borderWidth: '4px 12px 12px 4px',
              borderRadius: 14,
            }}
          />
          <div
            style={{
              width: 40,
              height: 40,
              borderLeft: '14px solid purple',
              borderTop: '6px solid orange',
              borderBottom: '6px dashed orange',
            }}
          />
          <div
            style={{
              width: 40,
              height: 40,
              borderWidth: 10,
              borderStyle: 'solid',
              borderColor: 'transparent transparent black',
            }}
          />
        </div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
