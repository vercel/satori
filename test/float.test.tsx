import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

// A 40x20 image, red on the left and blue on the right.
const image =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="20" height="20" fill="#e33"/><rect x="20" width="20" height="20" fill="#33e"/></svg>'
  )

const lorem =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'

const text = { fontSize: 14, margin: 0 }

describe('float', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should wrap text around a floated image', async () => {
    const svg = await satori(
      <div style={{ padding: 6, ...text }}>
        <p style={text}>
          <img
            src={image}
            width={60}
            height={40}
            style={{ float: 'left', marginRight: 8 }}
          />
          {lorem}
        </p>
      </div>,
      { width: 300, height: 110, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should wrap text around right floats', async () => {
    const svg = await satori(
      <div style={{ padding: 6, ...text, background: '#eef' }}>
        <div
          style={{
            float: 'right',
            width: 80,
            height: 60,
            background: 'teal',
            marginLeft: 6,
          }}
        />
        <p style={text}>{lorem}</p>
      </div>,
      { width: 300, height: 110, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should place floats next to each other and clear them', async () => {
    const svg = await satori(
      <div style={{ padding: 6, ...text }}>
        <div
          style={{ float: 'left', width: 50, height: 40, background: 'red' }}
        />
        <div
          style={{ float: 'left', width: 50, height: 60, background: 'green' }}
        />
        <div
          style={{ float: 'right', width: 50, height: 30, background: 'blue' }}
        />
        <span>Short text beside floats.</span>
        <div style={{ clear: 'both', background: 'gold' }}>Cleared block</div>
      </div>,
      { width: 300, height: 100, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should clear floats on one side', async () => {
    const svg = await satori(
      <div style={{ padding: 6, ...text }}>
        <div
          style={{ float: 'left', width: 50, height: 30, background: 'red' }}
        />
        <div
          style={{ float: 'right', width: 50, height: 60, background: 'blue' }}
        />
        <div style={{ clear: 'left', background: 'gold' }}>Clears left</div>
        <div style={{ clear: 'right', background: 'pink' }}>Clears right</div>
      </div>,
      { width: 300, height: 110, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should wrap later paragraphs around tall floats', async () => {
    const svg = await satori(
      <div style={{ padding: 6, ...text }}>
        <div
          style={{
            float: 'left',
            width: 60,
            height: 100,
            background: 'orange',
            marginRight: 6,
          }}
        />
        <p style={{ ...text, marginBottom: 6 }}>First paragraph is short.</p>
        <p style={text}>{lorem}</p>
      </div>,
      { width: 300, height: 130, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should place formatting context roots beside floats', async () => {
    const svg = await satori(
      <div style={{ padding: 6, ...text }}>
        <div
          style={{ float: 'left', width: 70, height: 50, background: 'purple' }}
        />
        <div style={{ display: 'flow-root', background: '#efe' }}>
          flow-root beside the float
        </div>
        <div style={{ overflow: 'hidden', background: '#fee', marginTop: 4 }}>
          overflow hidden beside it
        </div>
        <div style={{ background: '#eef' }}>a normal block goes under</div>
      </div>,
      { width: 300, height: 80, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should not grow containers for floats, unless they are flow roots', async () => {
    const svg = await satori(
      <div style={{ padding: 6 }}>
        <div style={{ background: 'pink', padding: 4 }}>
          <div
            style={{ float: 'left', width: 40, height: 30, background: 'red' }}
          />
        </div>
        <div
          style={{
            display: 'flow-root',
            background: 'lightblue',
            padding: 4,
            marginTop: 40,
          }}
        >
          <div
            style={{ float: 'left', width: 40, height: 30, background: 'blue' }}
          />
        </div>
      </div>,
      { width: 300, height: 90, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should move lines that do not fit beside floats below them', async () => {
    const svg = await satori(
      <div style={{ padding: 6, ...text }}>
        <div
          style={{ float: 'left', width: 150, height: 40, background: 'gray' }}
        />
        <p style={text}>Incomprehensibilities wordy text</p>
      </div>,
      { width: 200, height: 90, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should align lines beside floats', async () => {
    const svg = await satori(
      <div style={{ padding: 6, ...text }}>
        <div
          style={{ float: 'left', width: 80, height: 60, background: 'olive' }}
        />
        <p style={{ ...text, textAlign: 'center' }}>
          Centered text beside the float, wrapping onto more lines below.
        </p>
        <p style={{ ...text, textAlign: 'right' }}>Right aligned text.</p>
      </div>,
      { width: 300, height: 80, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should not float flex items', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 6, padding: 6 }}>
        <div style={{ width: 40, height: 40, background: 'red' }} />
        <div
          style={{ float: 'right', width: 40, height: 40, background: 'blue' }}
        />
      </div>,
      { width: 200, height: 52, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should throw for invalid values', async () => {
    await expect(
      satori(<div style={{ float: 'top' as any }} />, {
        width: 100,
        height: 100,
        fonts,
      })
    ).rejects.toThrowError('float')
  })
})
