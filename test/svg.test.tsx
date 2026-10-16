import { it, describe, expect, vi } from 'vitest'
import { createElement } from 'react'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { SVGNodeToImage } from '../src/handler/preprocess.js'

describe('SVG', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should escape values across SVG serialization boundaries', async () => {
    const payload = 'A & B "><path data-pwned="true"/>'
    const escapedPayload =
      'A &amp; B &quot;&gt;&lt;path data-pwned=&quot;true&quot;/&gt;'

    const dataUrl = await SVGNodeToImage(
      <svg data-label={payload}>
        <title data-label={payload} style={{ fontFamily: payload }}>
          {payload}
        </title>
      </svg>,
      'black'
    )

    expect(dataUrl).not.toContain('&')

    const serializedSVG = decodeURIComponent(dataUrl.split(',', 2)[1])
    expect(serializedSVG).toContain(`data-label="${escapedPayload}"`)
    expect(serializedSVG).toContain(
      `<title data-label="${escapedPayload}" style="font-family:${escapedPayload}">${escapedPayload}</title>`
    )
    expect(serializedSVG).not.toContain(payload)
  })

  it('should escape attributes generated outside inline SVG nodes', async () => {
    const payload = 'red"/><path data-pwned="true"/><text fill="red'
    const svg = await satori(<div style={{ color: payload }}>safe</div>, {
      width: 100,
      height: 100,
      fonts,
      embedFont: false,
    })

    expect(svg).not.toContain('<path data-pwned="true"')
    expect(svg).toContain(
      'fill="red&quot;/&gt;&lt;path data-pwned=&quot;true&quot;/&gt;&lt;text fill=&quot;red"'
    )
  })

  it('should reject structural XML injection', async () => {
    const invalidElement = createElement('path><path data-pwned="true"')
    await expect(
      SVGNodeToImage(createElement('svg', null, invalidElement), 'black')
    ).rejects.toThrow('Invalid XML element name')

    const invalidAttribute = createElement('path', {
      'data-label" data-pwned': 'true',
    })
    await expect(
      SVGNodeToImage(createElement('svg', null, invalidAttribute), 'black')
    ).rejects.toThrow('Invalid XML attribute name')
  })

  it('should reject caller-supplied internal style fields', async () => {
    await expect(
      satori(
        <div
          style={
            {
              _inheritedBackgroundClipTextPath: {
                value: '</clipPath><rect width="100" height="100"/><clipPath>',
              },
            } as any
          }
        />,
        { width: 100, height: 100, fonts }
      )
    ).rejects.toThrow(
      'Invalid style property: "_inheritedBackgroundClipTextPath"'
    )

    await expect(
      satori(
        <div
          style={
            {
              _inheritedClipPathId:
                'x)"/><rect width="100" height="100"/><g data-x="',
            } as any
          }
        />,
        { width: 100, height: 100, fonts }
      )
    ).rejects.toThrow('Invalid style property: "_inheritedClipPathId"')
  })

  it('should render svg nodes', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg viewBox='0 0 100 100'>
          <circle
            cx='50'
            cy='50'
            r='10'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render svg attributes correctly', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          viewBox='0 0 100 100'
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='50'
            cy='50'
            r='10'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render svg size correctly', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          width='100'
          viewBox='0 0 10 10'
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='5'
            cy='5'
            r='4'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should parse viewBox correctly', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          height='100'
          viewBox='0, 0,10.5 20.5 '
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='5'
            cy='5'
            r='4'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support em in svg size', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'blue',
          display: 'flex',
        }}
      >
        <svg
          height='5em'
          viewBox='0, 0,10.5 20.5 '
          fill='yellow'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx='5'
            cy='5'
            r='4'
            stroke='black'
            strokeWidth='3'
            fill='red'
          />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support currentColor for svg fill', async () => {
    const svg = await satori(
      <svg
        width='40'
        height='40'
        viewBox='0 0 15 15'
        fill='none'
        style={{ color: 'black' }}
        xmlns='http://www.w3.org/2000/svg'
      >
        <path
          d='M0.877014 7.49988C0.877014 3.84219 3.84216 0.877045 7.49985 0.877045C11.1575 0.877045 14.1227 3.84219 14.1227 7.49988C14.1227 11.1575 11.1575 14.1227 7.49985 14.1227C3.84216 14.1227 0.877014 11.1575 0.877014 7.49988ZM7.49985 1.82704C4.36683 1.82704 1.82701 4.36686 1.82701 7.49988C1.82701 8.97196 2.38774 10.3131 3.30727 11.3213C4.19074 9.94119 5.73818 9.02499 7.50023 9.02499C9.26206 9.02499 10.8093 9.94097 11.6929 11.3208C12.6121 10.3127 13.1727 8.97172 13.1727 7.49988C13.1727 4.36686 10.6328 1.82704 7.49985 1.82704ZM10.9818 11.9787C10.2839 10.7795 8.9857 9.97499 7.50023 9.97499C6.01458 9.97499 4.71624 10.7797 4.01845 11.9791C4.97952 12.7272 6.18765 13.1727 7.49985 13.1727C8.81227 13.1727 10.0206 12.727 10.9818 11.9787ZM5.14999 6.50487C5.14999 5.207 6.20212 4.15487 7.49999 4.15487C8.79786 4.15487 9.84999 5.207 9.84999 6.50487C9.84999 7.80274 8.79786 8.85487 7.49999 8.85487C6.20212 8.85487 5.14999 7.80274 5.14999 6.50487ZM7.49999 5.10487C6.72679 5.10487 6.09999 5.73167 6.09999 6.50487C6.09999 7.27807 6.72679 7.90487 7.49999 7.90487C8.27319 7.90487 8.89999 7.27807 8.89999 6.50487C8.89999 5.73167 8.27319 5.10487 7.49999 5.10487Z'
          fill='currentColor'
          fillRule='evenodd'
          clipRule='evenodd'
        />
      </svg>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support currentColor for svg stroke', async () => {
    const svg = await satori(
      <svg
        viewBox='0 0 20 10'
        xmlns='http://www.w3.org/2000/svg'
        style={{ color: 'blue' }}
      >
        <circle cx='5' cy='5' r='4' fill='none' stroke='currentColor' />
      </svg>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support currentColor when color is set on parent element', async () => {
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
          fontSize: 32,
          fontWeight: 600,
          color: 'red',
        }}
      >
        <svg
          width='75'
          viewBox='0 0 75 65'
          fill='currentColor'
          style={{ margin: '0 75px' }}
        >
          <path d='M37.59.25l36.95 64H.64l36.95-64z'></path>
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render svg prefer size props rather than viewBox', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100px',
          height: '100px',
          background: '#8250df',
          display: 'flex',
        }}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='60'
          viewBox='0 0 100 100'
        >
          <circle cx='50' cy='50' r='50' fill='red' />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should support currentColor when used on svg nodes', async () => {
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
          color: 'red',
        }}
      >
        <svg
          width='75'
          viewBox='0 0 75 65'
          fill='#000'
          style={{ margin: '0 75px' }}
        >
          <path
            stroke='currentColor'
            d='M37.59.25l36.95 64H.64l36.95-64z'
          ></path>
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should render svg without viewBox', async () => {
    const svg = await satori(
      <div
        style={{
          width: '100px',
          height: '100px',
          background: '#1a73e8',
          display: 'flex',
        }}
      >
        <svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'>
          <circle cx='50' cy='50' r='50' fill='red' />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should respect style on svg node', async () => {
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
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'>
          <circle cx='50' cy='50' r='50' style={{ fill: 'gold' }} />
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should resolve CSS variables in attributes and styles', async () => {
    const render = (content: JSX.Element) =>
      satori(
        <div style={{ display: 'flex', '--fill': 'red' } as any}>
          <svg viewBox='0 0 30 10' width='30' height='10'>
            {content}
          </svg>
        </div>,
        { width: 30, height: 10, fonts }
      )
    expect(
      await render(
        <>
          <rect width='10' height='10' fill='var(--fill)' />
          <g style={{ '--stroke': 'blue' } as any}>
            <rect x='10' width='10' height='10' stroke='var(--stroke)' />
          </g>
          <rect
            x='20'
            width='10'
            height='10'
            fill='var(--missing)'
            style={{ opacity: 'var(--opacity, 0.5)' }}
          />
        </>
      )
    ).toBe(
      await render(
        <>
          <rect width='10' height='10' fill='red' />
          <g>
            <rect x='10' width='10' height='10' stroke='blue' />
          </g>
          {/* An invalid value is ignored. */}
          <rect x='20' width='10' height='10' style={{ opacity: '0.5' }} />
        </>
      )
    )
  })

  it('should move to the start of closed subpaths that continue', async () => {
    // resvg panics when a command other than a move follows `z`.
    const render = (d: string) =>
      satori(
        <svg viewBox='0 0 20 20' width='20' height='20'>
          <path d={d} />
        </svg>,
        { width: 20, height: 20, fonts }
      )
    expect(await render('M2 2h6v6z a4 4 0 0 1 8 8Z l2 2')).toBe(
      await render('M2 2h6v6zm0 0 a4 4 0 0 1 8 8Zm0 0 l2 2')
    )
  })

  it('should render fragments inside svg', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
        }}
      >
        <svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'>
          <>
            <circle cx='50' cy='50' r='50' style={{ fill: 'gold' }} />
          </>
        </svg>
      </div>,
      { width: 100, height: 100, fonts }
    )

    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should keep the sizes of SVGs', async () => {
    const warn = vi.spyOn(console, 'warn')
    const render = (element: JSX.Element) =>
      satori(
        <div style={{ display: 'flex', width: 100, height: 100 }}>
          {element}
        </div>,
        { width: 100, height: 100, fonts }
      )
    try {
      // Without a viewBox, and with sizes as strings, like in HTML.
      for (const size of ['0', '20']) {
        const svg = await render(
          <svg width={size} height={size}>
            <rect width='10' height='10' fill='red' />
          </svg>
        )
        expect(svg).not.toMatch(/NaN|Infinity/)
      }
      expect(warn).not.toHaveBeenCalled()
    } finally {
      warn.mockRestore()
    }

    // The viewBox is fitted by the `preserveAspectRatio` of the SVG.
    expect(
      await toImage(
        await render(
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {['xMidYMid meet', 'xMinYMin meet', 'none'].map((aspect) => (
              <svg
                key={aspect}
                width={100}
                height={30}
                viewBox='0 0 10 10'
                preserveAspectRatio={aspect}
              >
                <circle cx='5' cy='5' r='5' fill='red' />
              </svg>
            ))}
          </div>
        ),
        100
      )
    ).toMatchImageSnapshot()

    // Like in browsers, the viewBox is centered in a box of another ratio.
    expect(
      await toImage(
        await render(
          <svg width={100} height={50} viewBox='0 0 10 10'>
            <rect width='10' height='10' fill='red' />
          </svg>
        ),
        100
      )
    ).toEqual(
      await toImage(
        await render(
          <div style={{ display: 'flex', width: 100, height: 50 }}>
            <div
              style={{
                width: 50,
                height: 50,
                marginLeft: 25,
                background: 'red',
              }}
            />
          </div>
        ),
        100
      )
    )
  })

  it('should size and fit SVGs like browsers', async () => {
    const render = async (element: JSX.Element) =>
      toImage(
        await satori(
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: 300,
              height: 160,
            }}
          >
            {element}
          </div>,
          { width: 300, height: 160, fonts }
        ),
        300
      )
    // `width: auto` follows the height and the ratio of the viewBox, like the
    // logo of Google.
    const logo = (style: Record<string, string>) => (
      <div style={{ display: 'flex', maxHeight: 92 }}>
        <svg
          width='272'
          height='92'
          viewBox='0 0 272 92'
          style={{ maxHeight: '100%', maxWidth: '100%', ...style }}
        >
          <rect width='272' height='92' fill='red' />
        </svg>
      </div>
    )
    expect(await render(logo({ width: 'auto' }))).toEqual(
      await render(logo({}))
    )

    // `object-fit` doesn't apply to inline SVGs.
    const circle = (style: Record<string, string>) => (
      <svg width={200} height={60} viewBox='0 0 10 10' style={style}>
        <circle cx='5' cy='5' r='5' fill='red' />
      </svg>
    )
    expect(
      await render(circle({ objectFit: 'contain', objectPosition: 'left' }))
    ).toEqual(await render(circle({})))

    expect(
      await render(
        <>
          {logo({ width: 'auto' })}
          {circle({ objectFit: 'fill' })}
        </>
      )
    ).toMatchImageSnapshot()
  })
})
