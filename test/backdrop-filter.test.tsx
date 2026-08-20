import { beforeAll, describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'

import { parseBackdropFilter } from '../src/parser/backdrop-filter.js'
import satori from '../src/index.js'
import { toImage } from './utils.js'

const inheritedStyle = {
  fontSize: 16,
  _viewportWidth: 1200,
  _viewportHeight: 630,
}

let fonts

beforeAll(async () => {
  fonts = [
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

describe('backdrop-filter', () => {
  it('parses blur()', () => {
    expect(parseBackdropFilter('blur(12px)', inheritedStyle)).toBe(12)
    expect(parseBackdropFilter('blur(0.5em)', inheritedStyle)).toBe(8)
    expect(parseBackdropFilter('none', inheritedStyle)).toBe(0)
    expect(() =>
      parseBackdropFilter('brightness(50%)', inheritedStyle)
    ).toThrow('Only `blur()` is supported')
    expect(() => parseBackdropFilter('blur(-2px)', inheritedStyle)).toThrow(
      'Invalid `blur()` radius'
    )
  })

  it('blurs the backdrop inside the element contour', async () => {
    const panels = [
      { label: 'Without blur', value: undefined },
      { label: 'Backdrop blur', value: 'blur(18px)' },
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
              backdrop-filter
            </span>
            <span>support in Satori</span>
          </div>
          <div style={{ marginTop: 20, fontSize: 18, color: '#5c6690' }}>
            SVG-native blur over everything painted behind the element
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            flex: 1,
            paddingTop: 42,
          }}
        >
          {panels.map((panel, index) => (
            <div
              key={panel.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 530,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: 530,
                  height: 300,
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 28,
                  background:
                    index === 0
                      ? 'linear-gradient(135deg, #3155ff 0%, #3155ff 48%, #ff5b45 48%, #ff5b45 100%)'
                      : 'linear-gradient(135deg, #9e7bff 0%, #9e7bff 48%, #c6ef46 48%, #c6ef46 100%)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    position: 'absolute',
                    left: 34,
                    top: 94,
                    fontFamily: 'Geist Mono',
                    fontSize: 62,
                    lineHeight: 1,
                    color: '#fff',
                  }}
                >
                  SHARP
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'absolute',
                    left: 178,
                    top: 48,
                    width: 272,
                    height: 204,
                    padding: '24px 26px',
                    borderRadius: 24,
                    background: 'rgba(255, 255, 255, 0.24)',
                    ...(panel.value ? { backdropFilter: panel.value } : {}),
                    border: '1px solid rgba(255, 255, 255, 0.72)',
                    color: '#fff',
                  }}
                >
                  <div style={{ fontSize: 17, opacity: 0.82 }}>SVG filter</div>
                  <div
                    style={{
                      marginTop: 28,
                      fontSize: 29,
                      lineHeight: 1.05,
                      fontWeight: 700,
                    }}
                  >
                    Soft glass, sharp type.
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: 18,
                }}
              >
                <div style={{ fontSize: 25, fontWeight: 700 }}>
                  {panel.label}
                </div>
                <div
                  style={{
                    fontFamily: 'Geist Mono',
                    fontSize: 14,
                    color: '#5c6690',
                  }}
                >
                  {panel.value
                    ? `backdrop-filter: ${panel.value};`
                    : 'backdrop-filter: none;'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>,
      { width: 1200, height: 630, fonts, pointScaleFactor: 2 }
    )

    expect(toImage(svg, 1200)).toMatchImageSnapshot()
  })
})
