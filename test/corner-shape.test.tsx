import { beforeAll, describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'

import expand from '../src/handler/expand.js'
import {
  parseCornerShapeValue,
  splitCornerShapeValues,
} from '../src/parser/corner-shape.js'
import satori from '../src/index.js'
import { toImage } from './utils.js'

const inheritedStyle = {
  color: 'black',
  fontSize: 16,
  opacity: 1,
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

describe('corner-shape', () => {
  it('parses keywords and superellipse functions', () => {
    expect(parseCornerShapeValue('round')).toBe(1)
    expect(parseCornerShapeValue('squircle')).toBe(2)
    expect(parseCornerShapeValue('square')).toBe(Infinity)
    expect(parseCornerShapeValue('bevel')).toBe(0)
    expect(parseCornerShapeValue('scoop')).toBe(-1)
    expect(parseCornerShapeValue('notch')).toBe(-Infinity)
    expect(parseCornerShapeValue('superellipse(-1.5)')).toBe(-1.5)
    expect(splitCornerShapeValues('scoop superellipse( -1.5 )')).toEqual([
      'scoop',
      'superellipse( -1.5 )',
    ])
    expect(() => parseCornerShapeValue('rounded')).toThrow(
      'Invalid corner shape value'
    )
  })

  it('expands shorthand and side values like border-radius', () => {
    expect(
      expand(
        {
          cornerShape: 'scoop square squircle',
          cornerLeftShape: 'bevel notch',
        },
        inheritedStyle
      )
    ).toMatchObject({
      cornerTopLeftShape: 'bevel',
      cornerTopRightShape: 'square',
      cornerBottomRightShape: 'squircle',
      cornerBottomLeftShape: 'notch',
    })
  })

  it('renders a bevel contour', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          background: 'red',
          borderRadius: 20,
          cornerShape: 'bevel',
        }}
      />,
      { width: 100, height: 100, fonts: [] }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('applies shaped corners to fills and directional borders', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          width: 100,
          height: 100,
          background: 'red',
          borderRadius: 20,
          cornerShape: 'bevel scoop square notch',
          borderTop: '4px solid blue',
          borderLeft: '6px dashed green',
          overflow: 'hidden',
        }}
      >
        <div style={{ width: 100, height: 100, background: 'yellow' }} />
      </div>,
      { width: 100, height: 100, fonts: [] }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('renders a uniform border around a shaped contour', async () => {
    const svg = await satori(
      <div
        style={{
          width: 100,
          height: 100,
          border: '4px solid blue',
          borderRadius: 20,
          cornerShape: 'squircle',
        }}
      />,
      { width: 100, height: 100, fonts: [] }
    )

    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('compares the corner shape values', async () => {
    const specimens = [
      { label: 'Default', value: undefined, color: '#3155ff' },
      { label: 'Squircle', value: 'squircle', color: '#ff5b45' },
      { label: 'Bevel', value: 'bevel', color: '#c6ef46' },
      { label: 'Scoop', value: 'scoop', color: '#ffcc32' },
      { label: 'Notch', value: 'notch', color: '#9e7bff' },
      { label: 'Square', value: 'square', color: '#49d6cf' },
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
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            paddingBottom: 24,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: 'Geist',
                fontSize: 42,
                lineHeight: 1,
                fontWeight: 400,
                fontFeatureSettings: '"calt" 0, "liga" 0',
                display: 'flex',
                gap: 10,
                alignItems: 'baseline',
                marginLeft: -4,
              }}
            >
              <span
                style={{
                  fontFamily: 'Geist Mono',
                  fontSize: 40,
                }}
              >
                corner-shape
              </span>
              <span>support in Satori</span>
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: 18,
                color: '#5c6690',
              }}
            >
              6 contours from CSS Borders Level 4
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flex: 1,
            paddingTop: 34,
          }}
        >
          {specimens.map((specimen, index) => (
            <div
              key={specimen.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 164,
              }}
            >
              <div
                style={{
                  width: 164,
                  height: 248,
                  background: specimen.color,
                  borderTopRightRadius: 100,
                  borderBottomLeftRadius: 100,
                  ...(specimen.value
                    ? {
                        cornerTopRightShape: specimen.value,
                        cornerBottomLeftShape: specimen.value,
                      }
                    : {}),
                  border: '1px solid #17204b',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  {specimen.value || 'round'}
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: '#5c6690',
                  }}
                >
                  <div>
                    {specimen.value
                      ? `corner-shape: ${specimen.value};`
                      : 'corner-shape: round;'}
                  </div>
                  <div>border-radius: 0 6em 0 6em;</div>
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
