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
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
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

  it('should lay out <html> and <body> like browsers', async () => {
    const content = <div style={{ height: 20, backgroundColor: 'blue' }} />
    const options = { width: 100, height: 60, fonts }
    expect(
      await satori(
        <html style={{ backgroundColor: 'gray' }}>
          <body style={{ backgroundColor: 'red' }}>{content}</body>
        </html>,
        options
      )
    ).toBe(
      await satori(
        <div style={{ display: 'block', backgroundColor: 'gray' }}>
          <div style={{ display: 'block', margin: 8, backgroundColor: 'red' }}>
            {content}
          </div>
        </div>,
        options
      )
    )
  })

  it('should hide elements like browsers', async () => {
    const box = { width: 10, height: 10, background: 'red' }
    const options = { width: 100, height: 40, fonts }
    expect(
      await satori(
        <div style={{ display: 'flex', gap: 4 }}>
          <div hidden style={box} />
          <div {...({ hidden: 'until-found' } as object)} style={box} />
          <input type='hidden' name='token' />
          {/* Styles override the user agent stylesheet. */}
          <div hidden style={{ ...box, display: 'block' }} />
        </div>,
        options
      )
    ).toBe(
      await satori(
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ ...box, display: 'none' }} />
          <div style={box} />
          <input style={{ display: 'none' }} />
          <div style={{ ...box, display: 'block' }} />
        </div>,
        options
      )
    )
  })

  it('should not lay out the content of elements that are hidden', async () => {
    const requested: string[] = []
    await satori(
      <div style={{ display: 'flex' }}>
        <style>{'.a { color: red } /* 你好 🎉 */'}</style>
        <div style={{ display: 'none' }}>
          你好 <span>🎉</span>
        </div>
        <div>👋</div>
      </div>,
      {
        width: 100,
        height: 40,
        fonts,
        loadAdditionalAsset: async (languageCode, segment) => {
          requested.push(`${languageCode} ${segment}`)
          return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg=='
        },
      }
    )
    // Only the displayed text needs assets.
    expect(requested).toEqual(['emoji 👋'])
  })

  it('should hide dialogs that are closed, and draw open ones', async () => {
    const page = (dialogs: JSX.Element | null) => (
      <div
        style={{
          display: 'block',
          position: 'relative',
          width: 300,
          height: 200,
          background: '#eee',
          fontSize: 16,
        }}
      >
        <div style={{ height: 10, background: 'red' }} />
        {dialogs}
        <div style={{ height: 10, background: 'blue' }} />
      </div>
    )
    const options = { width: 300, height: 200, fonts }
    // A closed dialog takes no space.
    expect(
      await toImage(
        await satori(
          page(
            <dialog>
              <div style={{ width: 50, height: 50 }} />
            </dialog>
          ),
          options
        ),
        300
      )
    ).toEqual(await toImage(await satori(page(null), options), 300))

    // An open one is centered at its static position, after the red box, like
    // in Chrome.
    let box: number[] = []
    const svg = await satori(
      page(
        <>
          <dialog>Closed</dialog>
          <dialog open>
            <div style={{ width: 60, height: 20, background: 'green' }} />
          </dialog>
        </>
      ),
      {
        ...options,
        onNodeDetected: (node) => {
          if (node.type === 'dialog' && node.props.open) {
            box = [node.left, node.top, node.width, node.height]
          }
        },
      }
    )
    expect(box).toEqual([101, 10, 98, 58])
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should not render elements that are hidden by default', async () => {
    const options = { width: 200, height: 60, fonts }
    const page = (hidden: any) => (
      <div style={{ display: 'flex', gap: 4, fontSize: 16 }}>
        <span>Visible</span>
        {hidden}
      </div>
    )
    const visible = await satori(page(null), options)
    expect(
      await satori(
        page(
          <>
            <head>
              <title>Title</title>
              <meta name='description' content='Description' />
            </head>
            <style>{'.title { color: red }'}</style>
            <style dangerouslySetInnerHTML={{ __html: 'p { color: red }' }} />
            <script dangerouslySetInnerHTML={{ __html: 'alert(1)' }} />
            <template>Template</template>
          </>
        ),
        options
      )
    ).toBe(visible)

    // Their text is still their content.
    expect(
      await satori(
        page(<style style={{ display: 'inline' }}>Visible</style>),
        options
      )
    ).toBe(
      await satori(
        page(<span style={{ display: 'inline' }}>Visible</span>),
        options
      )
    )

    // Other elements don't support inner HTML.
    await expect(
      satori(page(<div dangerouslySetInnerHTML={{ __html: 'x' }} />), options)
    ).rejects.toThrow('dangerouslySetInnerHTML property is not supported')
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

  it('should support prefixed flex values', async () => {
    const errors: string[] = []
    const element = (flex: string, inlineFlex: string) => (
      <div style={{ display: 'flex', flexDirection: 'column', width: 200 }}>
        <div style={{ display: flex, gap: 10, justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, background: 'red' }} />
          <div style={{ width: 40, height: 40, background: 'blue' }} />
        </div>
        <div style={{ display: 'block' }}>
          <div style={{ display: inlineFlex, gap: 10 }}>
            <div style={{ width: 30, height: 30, background: 'green' }} />
            <div style={{ width: 30, height: 30, background: 'orange' }} />
          </div>
        </div>
      </div>
    )
    const prefixed = await satori(
      element('-webkit-flex', '-webkit-inline-flex'),
      {
        width: 200,
        height: 120,
        fonts,
        onStyleError: (error) => errors.push(error.message),
      }
    )
    expect(errors).toEqual([])
    expect(prefixed).toBe(
      await satori(element('flex', 'inline-flex'), {
        width: 200,
        height: 120,
        fonts,
      })
    )
    expect(await toImage(prefixed, 200)).toMatchImageSnapshot()
  })
})
