import { beforeAll, describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'

import { parseShapeFunction } from '../src/parser/shape-function.js'
import satori from '../src/index.js'
import { toImage } from './utils.js'

const inheritedStyle = {
  color: 'black',
  fontSize: 16,
  opacity: 1,
  _viewportWidth: 1200,
  _viewportHeight: 630,
}

let comparisonFonts

beforeAll(async () => {
  comparisonFonts = [
    {
      name: 'Geist',
      data: await readFile(
        join(process.cwd(), 'test/assets/Geist-Regular.ttf')
      ),
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: await readFile(join(process.cwd(), 'test/assets/Geist-Bold.ttf')),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Geist Mono',
      data: await readFile(
        join(process.cwd(), 'test/assets/GeistMono-Regular.ttf')
      ),
      weight: 400,
      style: 'normal',
    },
  ]
})

describe('shape()', () => {
  it('converts commands into an SVG path', () => {
    expect(
      parseShapeFunction(
        'shape(evenodd from 10% 20%, line to 90% 20%, curve to 90% 80% with 100% 40% / 100% 60%, smooth by -80% 0 with -10% 20% from end, arc to 10% 20% of 20px 30px cw large rotate 0.25turn, close)',
        200,
        100,
        inheritedStyle
      )
    ).toEqual({
      type: 'path',
      d: 'M20,20 L180,20 C380,60 380,80 180,80 S0,100 20,80 A20,30 90 1 1 20,20 Z',
      'fill-rule': 'evenodd',
    })
  })

  it('supports relative lines and axis commands', () => {
    expect(
      parseShapeFunction(
        'shape(from 10px 10px, hline by 80%, vline to bottom, line by -80% -20px, close)',
        100,
        80,
        inheritedStyle
      )
    ).toMatchObject({
      d: 'M10,10 H90 V80 L10,60 Z',
    })
  })

  it('compares clip-path shape commands', async () => {
    const specimens = [
      {
        label: 'Lines',
        color: '#3155ff',
        shape:
          'shape(from 50% 0, line to 100% 38%, line to 82% 100%, line to 18% 100%, line to 0 38%, close)',
        code: ['from 50% 0,', 'line to 100% 38%, …'],
      },
      {
        label: 'Curves',
        color: '#ff5b45',
        shape:
          'shape(from 50% 0, curve to 100% 50% with 100% 0 from origin, smooth to 50% 100% with 100% 100% from origin, smooth to 0 50% with 0 100% from origin, smooth to 50% 0 with 0 0 from origin, close)',
        code: ['from 50% 0,', 'curve to 100% 50% …'],
      },
      {
        label: 'Relative',
        color: '#000',
        shape: 'shape(from 50% 5%, line by 50% 95%, line by -100% 0, close)',
        code: ['from 50% 5%,', 'line by 50% 95%, …'],
      },
      {
        label: 'Arcs',
        color: '#9e7bff',
        shape:
          'shape(from 0 50%, arc to 100% 50% of 50% 65% cw, arc to 0 50% of 50% 65% cw, close)',
        code: ['from 0 50%,', 'arc to 100% 50% …'],
      },
    ]

    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          padding: '42px 46px 36px',
          background: '#fff',
          color: '#17204b',
          fontFamily: 'Geist',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'baseline',
              marginLeft: -4,
              fontSize: 42,
              lineHeight: 1,
              fontWeight: 400,
            }}
          >
            <span style={{ fontFamily: 'Geist Mono', fontSize: 40 }}>
              shape()
            </span>
            <span>support for clip-path in Satori</span>
          </div>
          <div style={{ marginTop: 20, fontSize: 18, color: '#5c6690' }}>
            Native SVG paths from CSS shape commands
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flex: 1,
            paddingTop: 50,
          }}
        >
          {specimens.map((specimen) => (
            <div
              key={specimen.label}
              style={{ display: 'flex', flexDirection: 'column', width: 260 }}
            >
              <div
                style={{
                  width: 200,
                  height: 200,
                  background: specimen.color,
                  clipPath: specimen.shape,
                  color: '#faebd7',
                  fontSize: 20,
                  wordBreak: 'break-all',
                }}
              >
                Open source is how we build Vercel. We invest in frameworks,
                runtimes, and SDKs that power the modern web: projects we
                maintain, depend on, or meaningfully contribute to.
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 18,
                }}
              >
                <div
                  style={{ fontSize: 25, fontWeight: 700, marginBottom: 10 }}
                >
                  {specimen.label}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: 'Geist Mono',
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: '#5c6690',
                  }}
                >
                  <div>clip-path: shape(</div>
                  {specimen.code.map((line) => (
                    <div key={line} style={{ paddingLeft: 12 }}>
                      {line}
                    </div>
                  ))}
                  <div>);</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>,
      { width: 1200, height: 630, fonts: comparisonFonts, pointScaleFactor: 2 }
    )

    expect(toImage(svg, 1200)).toMatchImageSnapshot()
  })
})
