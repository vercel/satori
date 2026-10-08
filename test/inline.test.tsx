import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const square = (color: string, size = 20) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'%3E%3Crect width='${size}' height='${size}' fill='${color}'/%3E%3C/svg%3E`

describe('Inline layout', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const render = async (element: any, width = 260, height = 130) =>
    toImage(await satori(element, { width, height, fonts }), width)

  it('should flow text with different styles in lines', async () => {
    expect(
      await render(
        <p style={{ margin: 0, fontSize: 18 }}>
          Mixed <b style={{ color: 'red' }}>red</b>,{' '}
          <span style={{ fontSize: 30 }}>big</span>,{' '}
          <span style={{ fontSize: 12 }}>small</span> and{' '}
          <i style={{ color: 'blue' }}>blue text that wraps onto a new line</i>.
        </p>
      )
    ).toMatchImageSnapshot()
  })

  it('should draw inline boxes on each line', async () => {
    expect(
      await render(
        <div style={{ fontSize: 18, lineHeight: 2 }}>
          Some{' '}
          <span
            style={{
              background: '#fde68a',
              padding: '2px 8px',
              border: '2px solid #d97706',
              borderRadius: 6,
            }}
          >
            highlighted text across two lines
          </span>{' '}
          and more.
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should nest inline boxes', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          Outer{' '}
          <span style={{ background: '#bfdbfe', padding: '0 4px' }}>
            level one{' '}
            <span
              style={{
                background: '#93c5fd',
                color: 'white',
                padding: '0 4px',
              }}
            >
              level two
            </span>{' '}
            back
          </span>{' '}
          done
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should put images and inline-block elements on the baseline', async () => {
    expect(
      await render(
        <div style={{ fontSize: 18 }}>
          Image <img src={square('green')} width={20} height={20} /> on the
          baseline,{' '}
          <span
            style={{
              display: 'inline-block',
              padding: '2px 6px',
              background: '#fecaca',
              borderRadius: 4,
            }}
          >
            badge
          </span>{' '}
          inline-block.
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should support vertical-align of atomic inlines', async () => {
    expect(
      await render(
        <div style={{ fontSize: 18, background: '#f3f4f6' }}>
          x
          <img src={square('red', 30)} width={30} height={30} />
          <img
            src={square('green', 30)}
            width={30}
            height={30}
            style={{ verticalAlign: 'middle' }}
          />
          <img
            src={square('blue', 30)}
            width={30}
            height={30}
            style={{ verticalAlign: 'top' }}
          />
          <img
            src={square('orange', 30)}
            width={30}
            height={30}
            style={{ verticalAlign: 'bottom' }}
          />
          <img
            src={square('purple', 10)}
            width={10}
            height={10}
            style={{ verticalAlign: 'text-top' }}
          />
          <img
            src={square('black', 10)}
            width={10}
            height={10}
            style={{ verticalAlign: 'text-bottom' }}
          />
          x
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should break lines at <br>', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          First line
          <br />
          Second <b>line</b>
          <br />
          <br />
          After an empty line
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should split inline boxes around blocks', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          <span style={{ background: '#fde68a' }}>
            Before
            <div style={{ background: '#a7f3d0' }}>A block inside</div>
            after
          </span>
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should collapse white space across elements', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          {'  Spaces   collapse '}
          <b>{'  across  '}</b>
          {'  elements. '}
          <span style={{ whiteSpace: 'nowrap', background: '#e5e7eb' }}>
            This part never wraps
          </span>{' '}
          but this does.
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should align and indent lines', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          <p style={{ margin: 0, textAlign: 'center' }}>
            Centered <b style={{ color: 'red' }}>mixed</b> text that wraps
            across lines
          </p>
          <p style={{ margin: 0, textAlign: 'right' }}>
            Right <i style={{ color: 'blue' }}>aligned</i>
          </p>
          <p style={{ margin: 0, textAlign: 'justify' }}>
            Justified <b style={{ color: 'green' }}>text</b> spreads out the
            words of every line but the last one.
          </p>
          <p style={{ margin: 0, textIndent: 30 }}>
            Indented <b>first</b> line of a paragraph that wraps.
          </p>
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should decorate text across elements', async () => {
    expect(
      await render(
        <div style={{ fontSize: 18 }}>
          <u>
            Underlined <span style={{ color: 'red' }}>across</span> elements
          </u>
          , <s>struck</s> and{' '}
          <span style={{ textShadow: '2px 2px 2px #f00' }}>shadowed</span> text.
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should raise and lower text with vertical-align', async () => {
    expect(
      await render(
        <div style={{ fontSize: 20 }}>
          E = mc
          <sup style={{ verticalAlign: 'super', fontSize: 14 }}>2</sup> and H
          <sub style={{ verticalAlign: 'sub', fontSize: 14 }}>2</sub>O
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should lay out inline-flex elements as atomic inlines', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          Before{' '}
          <span
            style={{
              display: 'inline-flex',
              gap: 4,
              padding: 4,
              background: '#ddd6fe',
            }}
          >
            <span style={{ background: '#a78bfa', padding: '0 4px' }}>a</span>
            <span style={{ background: '#a78bfa', padding: '0 4px' }}>b</span>
          </span>{' '}
          after
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should transform and space text in inline elements', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          Normal,{' '}
          <span style={{ textTransform: 'uppercase', color: 'blue' }}>
            uppercase
          </span>
          , <span style={{ letterSpacing: 4 }}>spaced</span> and{' '}
          <span style={{ textTransform: 'capitalize' }}>capitalized words</span>
          .
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should draw inline elements with opacity', async () => {
    expect(
      await render(
        <div style={{ fontSize: 20 }}>
          Opaque and{' '}
          <span style={{ opacity: 0.4, background: 'red', color: 'white' }}>
            translucent
          </span>{' '}
          text
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should join adjacent text into one paragraph', async () => {
    const name = 'Satori'
    expect(
      await render(
        <div style={{ fontSize: 18, width: 150, background: '#eee' }}>
          Hello, {name}! This text is made of several strings.
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should shrink to fit inline content', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          <div
            style={{
              position: 'absolute',
              background: '#fde68a',
              padding: 4,
            }}
          >
            Short <b>content</b>
          </div>
          <div
            style={{
              position: 'absolute',
              top: 40,
              display: 'inline-block',
              background: '#bfdbfe',
              padding: 4,
            }}
          >
            Content that is <b style={{ color: 'blue' }}>much longer</b> than
            the width of the canvas wraps
          </div>
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should not draw inline elements that are not displayed', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16 }}>
          Visible <span style={{ display: 'none' }}>hidden</span>
          <span style={{ display: 'contents' }}>
            and <b style={{ color: 'red' }}>contents</b>
          </span>{' '}
          text
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should size atomic inlines with percentages of the paragraph', async () => {
    expect(
      await render(
        <div style={{ fontSize: 16, width: 200 }}>
          Image{' '}
          <img src={square('blue', 40)} style={{ width: '25%', height: 20 }} />{' '}
          is a quarter of the width
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should clip backgrounds to text in inline elements', async () => {
    expect(
      await render(
        <div
          style={{
            fontSize: 28,
            backgroundImage: 'linear-gradient(to right, red, blue)',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Gradient <b>text</b> across{' '}
          <span style={{ fontSize: 20 }}>elements</span>
        </div>
      )
    ).toMatchImageSnapshot()
  })

  it('should draw mixed text without embedded fonts', async () => {
    const svg = await satori(
      <div style={{ fontSize: 18 }}>
        Plain <b style={{ color: 'red' }}>red</b> text
      </div>,
      { width: 200, height: 50, fonts, embedFont: false }
    )
    expect(svg).toContain('<text')
    expect(svg).toContain('fill="red"')
  })
})
