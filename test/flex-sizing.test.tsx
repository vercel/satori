import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Flex sizing', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const render = (element: JSX.Element, width = 100, height = 100) =>
    satori(element, { width, height, fonts })

  it('should shrink items to fit by default', async () => {
    const svg = await render(
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div style={{ width: 60, height: 30, background: 'red' }} />
        <div style={{ width: 60, height: 30, background: 'green' }} />
        <div
          style={{ width: 60, height: 30, flexShrink: 0, background: 'blue' }}
        />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should not shrink text below its longest word', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          fontSize: 14,
          background: '#eee',
        }}
      >
        <div style={{ width: 80, height: 20, background: 'red' }} />
        <div style={{ background: 'yellow' }}>Unbreakable</div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should shrink text below its longest word with min-width: 0 or overflow: hidden', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          fontSize: 14,
          background: '#eee',
        }}
      >
        <div style={{ display: 'flex' }}>
          <div style={{ width: 80, height: 20, background: 'red' }} />
          <div style={{ minWidth: 0, background: 'yellow' }}>Unbreakable</div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ width: 80, height: 20, background: 'green' }} />
          <div style={{ overflow: 'hidden', background: 'yellow' }}>
            Unbreakable
          </div>
        </div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should wrap text in items centered in a column', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          padding: 10,
          fontSize: 14,
          background: '#eee',
        }}
      >
        <div style={{ textAlign: 'center', background: 'yellow' }}>
          The quick brown fox jumps over the lazy dog
        </div>
        <div style={{ background: 'lightblue' }}>Short</div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should wrap text in nested elements without text of their own', async () => {
    const svg = await render(
      <div style={{ display: 'flex', width: '100%', height: '100%' }}>
        <div style={{ display: 'flex', padding: 5, background: '#eee' }}>
          <div style={{ display: 'flex', padding: 5, background: 'yellow' }}>
            <span style={{ fontSize: 14 }}>
              Text wraps inside nested elements
            </span>
          </div>
        </div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should distribute free space with flex-grow and flex-basis', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
        }}
      >
        <div style={{ display: 'flex', height: 25 }}>
          <div style={{ flexGrow: 1, background: 'red' }} />
          <div style={{ flexGrow: 3, background: 'green' }} />
        </div>
        <div style={{ display: 'flex', height: 25 }}>
          <div style={{ flex: '1 1 50%', background: 'blue' }} />
          <div style={{ flex: '1 1 0%', background: 'orange' }} />
        </div>
        <div style={{ display: 'flex', height: 25 }}>
          <div style={{ flexBasis: 30, background: 'purple' }} />
          <div style={{ flexGrow: 1, maxWidth: 30, background: 'teal' }} />
        </div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support space-evenly', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
          width: '100%',
          height: '100%',
          background: '#eee',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-evenly',
            height: 20,
          }}
        >
          <div style={{ width: 10, background: 'red' }} />
          <div style={{ width: 10, background: 'red' }} />
          <div style={{ width: 10, background: 'red' }} />
        </div>
        <div style={{ height: 20, background: 'blue' }} />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should wrap items and align the lines', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'space-between',
          gap: 5,
          width: '100%',
          height: '100%',
          background: '#eee',
        }}
      >
        {['red', 'green', 'blue', 'orange', 'purple'].map((color) => (
          <div
            key={color}
            style={{ width: 30, height: 20, flexShrink: 0, background: color }}
          />
        ))}
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should respect the margins of top-level elements', async () => {
    const svg = await render(
      <div
        style={{
          width: 50,
          height: 50,
          margin: '25px 10px',
          background: 'red',
        }}
      />
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should lay out children of display: contents in the parent', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: '#eee',
        }}
      >
        <div style={{ width: 20, background: 'red' }} />
        <div style={{ display: 'contents' }}>
          <div style={{ width: 20, background: 'green' }} />
          <div style={{ width: 20, background: 'blue' }} />
        </div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should align items to the end and stretch them', async () => {
    const svg = await render(
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          width: '100%',
          height: '100%',
          background: '#eee',
        }}
      >
        <div style={{ width: 20, height: 30, background: 'red' }} />
        <div style={{ width: 20, alignSelf: 'stretch', background: 'green' }} />
        <div
          style={{
            width: 20,
            height: 30,
            alignSelf: 'center',
            background: 'blue',
          }}
        />
        <div
          style={{
            width: 20,
            height: 30,
            alignSelf: 'flex-start',
            background: 'orange',
          }}
        />
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should keep images in a row stretched or sized by their aspect ratio', async () => {
    const image =
      'data:image/svg+xml;base64,' +
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>'
      ).toString('base64')
    const svg = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          width: '100%',
          height: '100%',
          background: '#eee',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <img src={image} width={40} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <img src={image} style={{ height: 30 }} />
        </div>
      </div>
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })
})
