import { beforeAll, describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'

import { parseBackdropFilter } from '../src/parser/backdrop-filter.js'
import satori from '../src/index.js'
import { toImageWithSharp } from './utils.js'

const inheritedStyle = {
  fontSize: 16,
  _viewportWidth: 1200,
  _viewportHeight: 630,
}

let fonts
let balloonImage

beforeAll(async () => {
  balloonImage = `data:image/jpeg;base64,${(
    await readFile(join(process.cwd(), 'test/assets/balloon.jpg'))
  ).toString('base64')}`
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
  it('parses filter functions and chains', () => {
    expect(
      parseBackdropFilter(
        'blur(12px) brightness(125%) hue-rotate(0.5turn)',
        inheritedStyle
      )
    ).toEqual([
      { type: 'blur', value: 12 },
      { type: 'brightness', value: 1.25 },
      { type: 'hue-rotate', value: 180 },
    ])
    expect(parseBackdropFilter('grayscale()', inheritedStyle)).toEqual([
      { type: 'grayscale', value: 1 },
    ])
    expect(
      parseBackdropFilter(
        'drop-shadow(4px 6px 12px rgba(0, 0, 0, .4))',
        inheritedStyle
      )
    ).toEqual([
      {
        type: 'drop-shadow',
        offsetX: 4,
        offsetY: 6,
        blurRadius: 12,
        color: 'rgba(0, 0, 0, .4)',
      },
    ])
    expect(parseBackdropFilter('none', inheritedStyle)).toEqual([])
    expect(() => parseBackdropFilter('blur(-2px)', inheritedStyle)).toThrow(
      'Invalid `blur()` radius'
    )
    expect(() => parseBackdropFilter('url(#filter)', inheritedStyle)).toThrow(
      'Unsupported `url()`'
    )
  })

  it('compares all backdrop filter functions', async () => {
    const specimens = [
      {
        label: 'Original',
        value: 'none',
      },
      { label: 'Blur', value: 'blur(8px)' },
      { label: 'Brightness', value: 'brightness(200%)' },
      { label: 'Contrast', value: 'contrast(250%)' },
      { label: 'Grayscale', value: 'grayscale(100%)' },
      { label: 'Hue rotate', value: 'hue-rotate(120deg)' },
      { label: 'Invert', value: 'invert(100%)' },
      { label: 'Opacity', value: 'invert(100%) opacity(35%)' },
      { label: 'Saturate', value: 'saturate(50%)' },
      { label: 'Sepia', value: 'sepia(100%)' },
    ]
    const rows = [specimens.slice(0, 5), specimens.slice(5)]

    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 1200,
          height: 630,
          padding: '36px 46px 30px',
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
              fontSize: 38,
              lineHeight: 1,
              fontWeight: 400,
            }}
          >
            <span style={{ fontFamily: 'Geist Mono', fontSize: 36 }}>
              backdrop-filter
            </span>
            <span>support in Satori</span>
          </div>
          <div style={{ marginTop: 16, fontSize: 17, color: '#5c6690' }}>
            10 CSS filter functions, rendered with native SVG primitives
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            gap: 18,
            paddingTop: 28,
          }}
        >
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              {row.map((specimen, columnIndex) => {
                const index = rowIndex * 5 + columnIndex
                return (
                  <div
                    key={specimen.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: 204,
                      marginTop: 20,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        position: 'relative',
                        width: 204,
                        height: 126,
                      }}
                    >
                      <img
                        src={balloonImage}
                        width={142}
                        height={96}
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          width: 142,
                          height: 96,
                          borderRadius: 8,
                          objectFit: 'cover',
                          objectPosition: `${42 + (index % 3) * 8}% center`,
                        }}
                      />
                      <div
                        style={{
                          display: 'flex',
                          position: 'absolute',
                          left: 24,
                          top: 18,
                          width: 142,
                          height: 96,
                          borderRadius: 16,
                          background: 'rgba(255, 255, 255, 0.04)',
                          backdropFilter: specimen.value,
                          border: '1px solid rgba(155, 155, 155, 0.82)',
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'flex-start',
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          lineHeight: 1.1,
                          fontWeight: 700,
                        }}
                      >
                        {specimen.label}
                      </div>
                      <div
                        style={{
                          fontFamily: 'Geist Mono',
                          fontSize: 12,
                          lineHeight: 1.35,
                          color: '#5c6690',
                          wordBreak: 'break-word',
                        }}
                      >
                        {specimen.value}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>,
      { width: 1200, height: 630, fonts, pointScaleFactor: 2 }
    )

    expect(await toImageWithSharp(svg, 1200)).toMatchImageSnapshot()
  })
})
