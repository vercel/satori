import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Text Align', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('Should work correctly when `text-align: left`', async () => {
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
            display: 'flex',
            maxWidth: '190px',
            textAlign: 'left',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ff6c2f',
            color: 'white',
            letterSpacing: '1px',
          }}
        >
          God kisses the finite in his love and man the infinite
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-align: center`', async () => {
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
            display: 'flex',
            maxWidth: '190px',
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ff6c2f',
            color: 'white',
            letterSpacing: '1px',
          }}
        >
          God kisses the finite in his love and man the infinite
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-align: right`', async () => {
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
            display: 'flex',
            maxWidth: '190px',
            textAlign: 'right',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ff6c2f',
            color: 'white',
            letterSpacing: '1px',
          }}
        >
          God kisses the finite in his love and man the infinite
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly when `text-align: end`', async () => {
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
            display: 'flex',
            maxWidth: '190px',
            textAlign: 'end',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ff6c2f',
            color: 'white',
            letterSpacing: '1px',
          }}
        >
          God kisses the finite in his love and man the infinite
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
  it('Should work correctly when `text-align: justify`', async () => {
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
            display: 'flex',
            maxWidth: '190px',
            textAlign: 'justify',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ff6c2f',
            color: 'white',
            letterSpacing: '1px',
          }}
        >
          God kisses the finite in his love and man the infinite
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
