import { it, describe, expect } from 'vitest'
import { Resvg } from '@resvg/resvg-js'
import Sharp from 'sharp'
import type { ReactNode } from 'react'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

const WIDTH = 100
const HEIGHT = 100

const IMAGE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="green"/></svg>'
)}`

const LINES = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join(' ')

/** The RGBA pixels of the top of an SVG, drawn with resvg. */
async function pixels(svg: string) {
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
    .render()
    .asPng()
  const data = await Sharp(png).ensureAlpha().raw().toBuffer()
  return data.subarray(0, WIDTH * HEIGHT * 4)
}

function countNonWhite(data: Uint8Array) {
  let count = 0
  for (let i = 0; i < data.length; i += 4) {
    if (
      data[i + 3] &&
      (data[i] < 250 || data[i + 1] < 250 || data[i + 2] < 250)
    )
      count++
  }
  return count
}

describe('Culling', () => {
  let fonts
  initFonts((f) => (fonts = f))

  /**
   * Expects the element drawn on the image to look like the top of the
   * element drawn on a taller image, where nothing is outside, and something
   * to be drawn.
   */
  async function expectSameAsTaller(element: ReactNode) {
    const svg = await satori(element, { width: WIDTH, height: HEIGHT, fonts })
    const tallSvg = await satori(element, {
      width: WIDTH,
      height: HEIGHT * 4,
      fonts,
    })
    const drawn = await pixels(svg)
    const expected = await pixels(tallSvg)
    let different = 0
    for (let i = 0; i < drawn.length; i++) {
      if (drawn[i] !== expected[i]) different++
    }
    expect(different).toBe(0)
    expect(countNonWhite(drawn)).toBeGreaterThan(0)
    return { svg, tallSvg }
  }

  const page = (children: ReactNode) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: WIDTH,
        height: HEIGHT * 4,
        backgroundColor: 'white',
        position: 'relative',
      }}
    >
      {children}
    </div>
  )

  it('should not draw what is outside of the image', async () => {
    const { svg, tallSvg } = await expectSameAsTaller(
      page(
        <>
          <div style={{ height: 80, backgroundColor: 'red' }}>Visible</div>
          <div style={{ fontSize: 14, lineHeight: 1.5 }}>{LINES}</div>
          <div
            style={{
              height: 40,
              backgroundColor: 'blue',
              // Filters of colors don't draw outside of the box.
              filter: 'grayscale(1)',
            }}
          />
          <img src={IMAGE} width={20} height={20} />
        </>
      )
    )
    expect(tallSvg).toContain('<image')
    expect(svg).not.toContain('<image')
    expect(svg).not.toContain('fill="blue"')
    expect(svg.length).toBeLessThan(tallSvg.length / 2)
  })

  it('should draw boxes and lines that are partly inside of the image', async () => {
    await expectSameAsTaller(
      page(
        <>
          <div style={{ height: 85 }} />
          <div style={{ fontSize: 20, lineHeight: '30px' }}>{LINES}</div>
          <div
            style={{
              position: 'absolute',
              left: 50,
              top: 95,
              width: 20,
              height: 20,
              backgroundColor: 'red',
            }}
          />
        </>
      )
    )
  })

  it('should draw shadows and outlines that reach into the image', async () => {
    await expectSameAsTaller(
      page(
        <>
          <div
            style={{
              position: 'absolute',
              left: 10,
              top: 120,
              width: 30,
              height: 30,
              backgroundColor: 'white',
              boxShadow: '0 -40px 4px red',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 60,
              top: 110,
              width: 30,
              height: 30,
              outline: '8px solid blue',
              outlineOffset: 4,
            }}
          />
        </>
      )
    )
  })

  it('should draw what transforms move into the image', async () => {
    await expectSameAsTaller(
      page(
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 300,
            display: 'flex',
            transform: 'translateY(-250px)',
          }}
        >
          <div style={{ fontSize: 16 }}>Moved</div>
          <img src={IMAGE} width={20} height={20} />
        </div>
      )
    )
  })

  // resvg doesn't draw filters of what's outside of the image, so the markup
  // is compared.
  it('should draw text shadows and filters', async () => {
    const element = page(
      <>
        <div
          style={{
            position: 'absolute',
            left: 10,
            top: 110,
            fontSize: 20,
            textShadow: '0 -30px 0 green',
          }}
        >
          Shadow
        </div>
        <div
          style={{
            position: 'absolute',
            left: 60,
            top: 200,
            width: 30,
            height: 30,
            backgroundColor: 'red',
            filter: 'drop-shadow(0 -150px 0 blue)',
          }}
        />
      </>
    )
    const count = (svg: string, tag: string) => svg.split(`<${tag}`).length - 1
    const svg = await satori(element, { width: WIDTH, height: HEIGHT, fonts })
    const tallSvg = await satori(element, {
      width: WIDTH,
      height: HEIGHT * 4,
      fonts,
    })
    expect(count(svg, 'filter')).toBe(2)
    expect(count(svg, 'filter')).toBe(count(tallSvg, 'filter'))
    expect(count(svg, 'path')).toBe(count(tallSvg, 'path'))
    expect(svg).toContain('fill="red"')
  })

  it('should keep the clip paths of descendants', async () => {
    await expectSameAsTaller(
      page(
        <>
          <div style={{ height: 20, backgroundColor: 'gray' }} />
          <div
            style={{
              position: 'absolute',
              top: 150,
              left: 0,
              width: 100,
              height: 50,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -100,
                left: 10,
                width: 50,
                height: 50,
                backgroundColor: 'red',
              }}
            />
          </div>
        </>
      )
    )
  })

  it('should report the elements outside of the image', async () => {
    const element = page(
      <>
        <div style={{ height: 300 }} />
        <div style={{ fontSize: 14 }}>Outside</div>
      </>
    )
    const count = async (height: number) => {
      let nodes = 0
      await satori(element, {
        width: WIDTH,
        height,
        fonts,
        onNodeDetected: () => nodes++,
      })
      return nodes
    }
    expect(await count(HEIGHT)).toBe(await count(HEIGHT * 4))
  })
})
