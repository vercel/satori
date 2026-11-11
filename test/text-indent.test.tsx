import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Text Indent', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('Should work correctly with positive pixel indent', async () => {
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
            textIndent: '40px',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This is a multiline text that should have the first line indented by
          40 pixels
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with negative indent (hanging indent)', async () => {
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
            textIndent: '-20px',
            paddingLeft: '20px',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This is a multiline text with hanging indent for the first line
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with percentage value', async () => {
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
            width: '190px',
            textIndent: '20%',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This text has a first line indented by 20% of container width
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with em units', async () => {
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
            textIndent: '2em',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This text has a first line indented by 2em (relative to font size)
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with text-align: center', async () => {
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
            textIndent: '30px',
            textAlign: 'center',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This text is centered and has an indent on the first line
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with text-align: right', async () => {
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
            textIndent: '30px',
            textAlign: 'right',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This text is right-aligned and has an indent on the first line
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with text-align: justify', async () => {
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
            textIndent: '30px',
            textAlign: 'justify',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This text is justified and has an indent on the first line only
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with single line text', async () => {
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
            width: '190px',
            textIndent: '40px',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          Single line
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should inherit from parent', async () => {
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
          textIndent: '30px',
        }}
      >
        <div
          style={{
            display: 'flex',
            maxWidth: '190px',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This text inherits the text-indent from the parent element
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should override inherited value', async () => {
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
          textIndent: '30px',
        }}
      >
        <div
          style={{
            display: 'flex',
            maxWidth: '190px',
            textIndent: '10px',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This text overrides the inherited text-indent with a smaller value
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should work correctly with zero indent', async () => {
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
            textIndent: '0px',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This text has no indent on the first line baseline test
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should indent the lines after the first with hanging', async () => {
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
            textIndent: '40px hanging',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          This is a multiline text that should have every line but the first
          indented by 40 pixels
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should indent the lines after forced breaks with each-line', async () => {
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
            whiteSpace: 'pre-line',
            textIndent: 'each-line 30px',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          {
            'The first line is indented\nand so is the first line after a line break'
          }
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should only indent wrapped lines with hanging and each-line', async () => {
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
            whiteSpace: 'pre-line',
            textIndent: 'hanging each-line 30px',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          {
            'Only the lines that wrap are indented\nnot those after a line break'
          }
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should support hanging and each-line with inline elements', async () => {
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
            display: 'block',
            width: '190px',
            textIndent: '30px each-line hanging',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          Only the lines that <span style={{ color: 'black' }}>wrap</span> are
          indented
          <br />
          not those after a line break
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should break words wider than the line beside its indent', async () => {
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
            display: 'block',
            width: '190px',
            overflowWrap: 'break-word',
            textIndent: '60px hanging',
            backgroundColor: '#ff6c2f',
            color: 'white',
          }}
        >
          A long word: Supercalifragilistic
        </div>
      </div>,
      { width: 200, height: 200, fonts, embedFont: true }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('Should ignore values with repeated keywords or without a length', async () => {
    const render = (textIndent: string) =>
      satori(
        <div
          style={{
            display: 'flex',
            width: '190px',
            fontSize: 20,
            textIndent,
          }}
        >
          This is a multiline text that should not be indented
        </div>,
        { width: 200, height: 200, fonts, embedFont: true }
      )
    const unindented = await render('0px')
    expect(await render('hanging')).toBe(unindented)
    expect(await render('each-line hanging')).toBe(unindented)
    expect(await render('20px hanging hanging')).toBe(unindented)
  })
})
