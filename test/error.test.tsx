import { it, describe, expect, vi } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Error', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should throw for unsupported display values', async () => {
    await expect(
      satori(<div style={{ display: 'table' }}>Test</div>, {
        width: 10,
        height: 10,
        fonts,
      })
    ).rejects.toThrowError(
      `Invalid value for CSS property "display". Allowed values: "block" | "flow-root" | "list-item" | "flex" | "-webkit-flex" | "-webkit-box" | "grid" | "inline" | "inline-block" | "inline-flex" | "-webkit-inline-flex" | "inline-grid" | "contents" | "none". Received: "table".`
    )
  })

  it('should throw if using invalid values', async () => {
    const result = satori(
      <div style={{ position: 'floating' as any }}>Test</div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    await expect(result).rejects.toThrowError(
      `Invalid value for CSS property "position". Allowed values: "absolute" | "relative" | "static" | "fixed" | "sticky". Received: "floating".`
    )
  })

  it('should not throw if display none on div that has children', async () => {
    const svg = await satori(
      <div style={{ display: 'none' }}>
        Test <span>satori</span> with space
      </div>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if flex missing on span that has children', async () => {
    const svg = await satori(
      <span>
        Test <span>satori</span> with space
      </span>,
      {
        width: 10,
        height: 10,
        fonts,
      }
    )
    expect(typeof svg).toBe('string')
  })

  it('should not throw if flex missing on div without children', async () => {
    const svg = await satori(<div></div>, {
      width: 10,
      height: 10,
      fonts,
    })
    expect(typeof svg).toBe('string')
  })

  it('should not allowed to set negative value to rg-size', async () => {
    const result = satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage:
            'radial-gradient(-20% 20% at top left, yellow, blue)',
          fontSize: 32,
          fontWeight: 600,
        }}
      ></div>,
      {
        width: 100,
        height: 100,
        fonts,
      }
    )

    expect(result).rejects.toThrowError(
      'disallow setting negative values to the size of the shape. Check https://w3c.github.io/csswg-drafts/css-images/#valdef-rg-size-length-0'
    )
  })

  it('should name the invalid transform function', async () => {
    const render = satori(
      <div style={{ transform: 'translateX(calc(10px + 5px)) wobble(3)' }} />,
      { width: 100, height: 100, fonts }
    )
    await expect(render).rejects.toThrowError(
      'Invalid transform function: "wobble(3)".'
    )
    await expect(render).rejects.not.toThrowError('calc()')
  })

  it('should ignore invalid styles with onStyleError', async () => {
    const errors: string[] = []
    const svg = await satori(
      <div style={{ display: 'flex', width: 100, height: 100 }}>
        <div
          style={{
            display: 'table',
            transform: 'wobble(3)',
            backgroundImage: 'foo(1)',
            overflow: 'sideways',
            width: 50,
            height: 50,
            backgroundColor: 'red',
          }}
        />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        onStyleError: (error) => errors.push(error.message),
      }
    )
    expect(errors).toEqual([
      expect.stringContaining('Invalid transform function: "wobble(3)"'),
      expect.stringContaining('Invalid value for CSS property "overflow"'),
      expect.stringContaining('Invalid background image: "foo(1)"'),
      expect.stringContaining('Invalid value for CSS property "display"'),
    ])
    // The other declarations still apply.
    expect(svg).toContain('width="50" height="50" fill="red"')
  })

  it('should report invalid sizes, insets and margins with onStyleError', async () => {
    const errors: string[] = []
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const svg = await satori(
      <div style={{ display: 'flex', width: 100, height: 100 }}>
        <div
          style={{
            position: 'absolute',
            top: 'up',
            marginLeft: 'lots',
            width: 50,
            height: 50,
            minWidth: 'full',
            maxWidth: 'full',
            backgroundColor: 'red',
          }}
        />
        <div style={{ width: 'wide', height: 20, backgroundColor: 'blue' }} />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        onStyleError: (error) => errors.push(error.message),
      }
    )
    warn.mockRestore()
    expect(errors).toEqual([
      'Invalid value "full" for "maxWidth". Expected a number or a percentage value (e.g., "50%").',
      'Invalid value "full" for "minWidth". Expected a number or a percentage value (e.g., "50%").',
      'Invalid value "lots" for "marginLeft". Expected a number, "auto", or a percentage value (e.g., "50%").',
      'Invalid value "up" for "top". Expected a number or a percentage value (e.g., "50%").',
      'Invalid value "wide" for "width". Expected a number, "auto", or a percentage value (e.g., "50%").',
    ])
    expect(warn).not.toHaveBeenCalled()
    // The other declarations still apply.
    expect(svg).toContain('width="50" height="50" fill="red"')
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should drop invalid sizes of stylesheets like browsers', async () => {
    const render = (onStyleError?: (error: Error) => void) => {
      let width = 0
      return satori(
        <div style={{ display: 'flex', width: 100, height: 100 }}>
          <style>{'.a { max-width: 30px } .b { max-width: full }'}</style>
          <div
            data-target
            className='a b'
            style={{ width: 100, height: 20, backgroundColor: 'red' }}
          />
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
          onStyleError,
          onNodeDetected: (node) => {
            if (node.props['data-target']) width = node.width
          },
        }
      ).then((svg) => ({ svg, width }))
    }
    // The earlier maximum applies, like in Chrome.
    const errors: string[] = []
    const { svg, width } = await render((error) => errors.push(error.message))
    expect(width).toBe(30)
    expect(errors).toEqual([
      expect.stringContaining('Invalid value "full" for "maxWidth"'),
    ])
    expect(await toImage(svg, 100)).toMatchImageSnapshot()

    // Without onStyleError, the stylesheet drops it too, with a warning.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect((await render()).width).toBe(30)
    warn.mockRestore()
  })

  it('should keep valid keywords of sizes and margins', async () => {
    const errors: string[] = []
    let box: number[] = []
    const svg = await satori(
      <div style={{ display: 'flex', width: 40, height: 10 }}>
        <style>
          {
            '.a { min-width: 80px; min-height: 30px } .b { min-width: auto; min-height: AUTO }'
          }
        </style>
        <div
          data-target
          className='a b'
          style={{ width: 100, backgroundColor: 'red' }}
        />
        <div style={{ width: 'AUTO', marginLeft: 'AUTO' }} />
      </div>,
      {
        width: 100,
        height: 100,
        fonts,
        onStyleError: (error) => errors.push(error.message),
        onNodeDetected: (node) => {
          if (node.props['data-target']) box = [node.width, node.height]
        },
      }
    )
    expect(errors).toEqual([])
    // The later `auto` minimums apply, like in Chrome.
    expect(box).toEqual([40, 10])
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })
})
