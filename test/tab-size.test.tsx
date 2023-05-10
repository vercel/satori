import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('tab-size', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it("Tab renders as space when white-space is not 'pre' or 'pre-wrap'", async () => {
    const tab = String.fromCodePoint(0x09)
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
        }}
      >
        <div style={{ display: 'flex' }}>{tab}one tab</div>
        <div style={{ display: 'flex', tabSize: 8 }}>{tab}one tab</div>
        <div style={{ display: 'flex' }}>1{tab}one tab</div>
        <div style={{ display: 'flex' }}>1111{tab}one tab</div>
        <div style={{ display: 'flex' }}>
          {tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}
          {tab}three tabs
        </div>
      </div>,
      {
        width: 150,
        height: 150,
        fonts,
      }
    )

    expect(toImage(svg, 150)).toMatchImageSnapshot()
  })

  it("Tabs render correctly with default tab-size of 8 when white-space is 'pre'", async () => {
    const tab = String.fromCodePoint(0x09)
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          whiteSpace: 'pre',
        }}
      >
        <div style={{ display: 'flex' }}>{tab}one tab</div>
        <div style={{ display: 'flex', tabSize: 8 }}>{tab}one tab</div>
        <div style={{ display: 'flex' }}>1{tab}one tab</div>
        <div style={{ display: 'flex' }}>1111{tab}one tab</div>
        <div style={{ display: 'flex' }}>
          {tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}
          {tab}three tabs
        </div>
      </div>,
      {
        width: 150,
        height: 150,
        fonts,
      }
    )

    expect(toImage(svg, 150)).toMatchImageSnapshot()
  })

  it('Tabs render correctly when tab-size is a number', async () => {
    const tab = String.fromCodePoint(0x09)
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          whiteSpace: 'pre',
          tabSize: 4,
        }}
      >
        <div style={{ display: 'flex' }}>{tab}one tab</div>
        <div style={{ display: 'flex', tabSize: 8 }}>{tab}one tab</div>
        <div style={{ display: 'flex' }}>1{tab}one tab</div>
        <div style={{ display: 'flex' }}>1111{tab}one tab</div>
        <div style={{ display: 'flex' }}>
          {tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}
          {tab}three tabs
        </div>
      </div>,
      {
        width: 150,
        height: 150,
        fonts,
      }
    )

    expect(toImage(svg, 150)).toMatchImageSnapshot()
  })

  it('Tabs render correctly when tab-size is a string', async () => {
    const tab = String.fromCodePoint(0x09)
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          whiteSpace: 'pre',
          tabSize: '10px',
        }}
      >
        <div style={{ display: 'flex' }}>{tab}one tab</div>
        <div style={{ display: 'flex', tabSize: '1rem' }}>{tab}one tab</div>
        <div style={{ display: 'flex' }}>1{tab}one tab</div>
        <div style={{ display: 'flex' }}>1111{tab}one tab</div>
        <div style={{ display: 'flex' }}>
          {tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}
          {tab}three tabs
        </div>
      </div>,
      {
        width: 150,
        height: 150,
        fonts,
      }
    )

    expect(toImage(svg, 150)).toMatchImageSnapshot()
  })

  it("Tabs render correctly with default tab-size of 8 when white-space is 'pre-wrap'", async () => {
    const tab = String.fromCodePoint(0x09)
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#fff',
          whiteSpace: 'pre-wrap',
        }}
      >
        <div style={{ display: 'flex' }}>{tab}one tab</div>
        <div style={{ display: 'flex', tabSize: 8 }}>{tab}one tab</div>
        <div style={{ display: 'flex' }}>1{tab}one tab</div>
        <div style={{ display: 'flex' }}>1111{tab}one tab</div>
        <div style={{ display: 'flex' }}>
          {tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}two tabs
        </div>
        <div style={{ display: 'flex' }}>
          1{tab}
          {tab}
          {tab}three tabs
        </div>
      </div>,
      {
        width: 150,
        height: 150,
        fonts,
      }
    )

    expect(toImage(svg, 150)).toMatchImageSnapshot()
  })
})
