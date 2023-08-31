import { it, describe, expect } from 'vitest'

import { initFonts, loadDynamicAsset, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Text Decoration', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('Should work correctly when `text-decoration-line: line-through` and `text-align: right`', async () => {
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
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'line-through',
            color: 'white',
            textAlign: 'center',
          }}
        >
          你好! It doesn’t 안녕! exist, it never has. I’m nostalgic for a place
          that never existed.
        </div>
      </div>,
      {
        width: 200,
        height: 200,
        fonts,
        loadAdditionalAsset: (languageCode: string, segment: string) => {
          return loadDynamicAsset(languageCode, segment) as any
        },
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-line: underline` and `text-align: right`', async () => {
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
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            color: 'white',
            textAlign: 'right',
          }}
        >
          你好! It doesn’t 안녕! exist, it never has. I’m nostalgic for a place
          that never existed.
        </div>
      </div>,
      {
        width: 200,
        height: 200,
        fonts,
        loadAdditionalAsset: (languageCode: string, segment: string) => {
          return loadDynamicAsset(languageCode, segment) as any
        },
      }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-style: dotted`', async () => {
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
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            textDecorationStyle: 'dotted',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-decoration-style: dashed`', async () => {
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
          fontSize: 20,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            maxWidth: '190px',
            backgroundColor: '#91a8d0',
            textDecorationLine: 'underline',
            textDecorationStyle: 'dashed',
            color: 'white',
          }}
        >
          It doesn’t exist, it never has. I’m nostalgic for a place that never
          existed.
        </div>
      </div>,
      { width: 200, height: 200, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
