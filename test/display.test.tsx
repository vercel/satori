import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('display', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const render = async (element: any, width = 200, height = 120) =>
    toImage(await satori(element, { width, height, fonts }), width)

  it('should support display: contents', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          gap: 10,
          backgroundColor: '#e2e2e2',
        }}
      >
        <div
          style={{
            display: 'contents',
          }}
        >
          <div
            style={{
              height: 10,
              width: 10,
              backgroundColor: 'black',
            }}
          />
          <div
            style={{
              height: 10,
              width: 10,
              backgroundColor: 'black',
            }}
          />
        </div>
      </div>,
      { width: 100, height: 100, fonts: [] }
    )
    expect(toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should lay out <div> elements as blocks', async () => {
    expect(
      await render(
        <div style={{ fontSize: 14, background: '#f3f4f6' }}>
          <div style={{ background: '#fca5a5' }}>A block fills the width</div>
          <div style={{ background: '#93c5fd', width: 120 }}>
            and stacks vertically
          </div>
          Text after blocks
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should lay out <span> elements inline', async () => {
    expect(
      await render(
        <div style={{ fontSize: 14 }}>
          A <span style={{ background: '#fde68a' }}>span</span> and{' '}
          <span style={{ background: '#a7f3d0' }}>another span</span> flow in
          the text of the block.
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should apply the default styles of elements', async () => {
    expect(
      await render(
        <div style={{ fontSize: 12 }}>
          <h1 style={{ marginTop: 0 }}>Heading</h1>
          <p>
            A paragraph with <strong>strong</strong> and <em>emphasized</em>{' '}
            text.
          </p>
          <ul style={{ marginBottom: 0 }}>
            <li>An item</li>
          </ul>
        </div>,
        200,
        140
      )
    ).toMatchImageSnapshot()
  })

  it('should blockify children of flex containers', async () => {
    expect(
      await render(
        <div
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 14,
            height: '100%',
            alignItems: 'center',
          }}
        >
          <span style={{ background: '#fde68a', width: 60, height: 60 }}>
            span
          </span>
          <span
            style={{
              display: 'inline-block',
              background: '#a7f3d0',
              height: 40,
            }}
          >
            inline-block
          </span>
          Text
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should blockify the root element and positioned elements', async () => {
    expect(
      await render(
        <span style={{ background: '#e5e7eb', fontSize: 14 }}>
          A root span is a block
          <span
            style={{
              position: 'absolute',
              top: 40,
              left: 20,
              width: 80,
              height: 40,
              background: '#fca5a5',
            }}
          >
            positioned
          </span>
        </span>
      )
    ).toMatchImageSnapshot()
  })

  it('should size inline-block but not inline elements', async () => {
    expect(
      await render(
        <div style={{ fontSize: 14 }}>
          <span style={{ width: 100, height: 40, background: '#fde68a' }}>
            inline
          </span>{' '}
          <span
            style={{
              display: 'inline-block',
              width: 100,
              height: 40,
              background: '#a7f3d0',
            }}
          >
            inline-block
          </span>
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should make <div> elements inline with display: inline', async () => {
    expect(
      await render(
        <div style={{ fontSize: 14 }}>
          <div style={{ display: 'inline', background: '#fde68a' }}>One</div>{' '}
          <div style={{ display: 'inline', background: '#a7f3d0' }}>Two</div>{' '}
          <div
            style={{
              display: 'inline-grid',
              gridTemplateColumns: '20px 20px',
              background: '#bfdbfe',
            }}
          >
            <span>a</span>
            <span>b</span>
          </div>
        </div>
      )
    ).toMatchImageSnapshot()
  })
})
