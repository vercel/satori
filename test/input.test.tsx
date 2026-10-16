import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Input', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const render = (element: JSX.Element, css = '') =>
    satori(
      <div style={{ display: 'flex', width: 200, height: 100 }}>
        {element}
        <style>{css}</style>
      </div>,
      { width: 200, height: 100, fonts }
    )

  it('should render the value or the placeholder of text inputs', async () => {
    expect(await render(<input placeholder='Email' />)).not.toBe(
      await render(<input />)
    )
    // Placeholders are gray, or styled with `::placeholder`.
    expect(await render(<input placeholder='Email' />)).toBe(
      await render(<input value='Email' style={{ color: '#757575' }} />)
    )
    expect(
      await render(
        <input placeholder='Email' />,
        'input::placeholder { color: red }'
      )
    ).toBe(await render(<input value='Email' style={{ color: 'red' }} />))
    expect(await render(<input placeholder='Email' defaultValue='Hi' />)).toBe(
      await render(<input value='Hi' />)
    )
    expect(await render(<input type='password' value='abc' />)).toBe(
      await render(<input value={'\u2022\u2022\u2022'} />)
    )
    // Other inputs have no content.
    expect(await render(<input type='checkbox' value='on' />)).toBe(
      await render(<input type='checkbox' />)
    )
  })

  it('should render the labels of button inputs', async () => {
    const style = {
      height: 36,
      padding: '0 16px',
      background: '#f8f9fa',
      border: '1px solid #dadce0',
      borderRadius: 4,
      fontSize: 14,
      color: '#3c4043',
    }
    // Without a value, submit and reset inputs have a default label.
    expect(await render(<input type='submit' style={style} />)).toBe(
      await render(<input type='submit' value='Submit' style={style} />)
    )
    expect(await render(<input type='reset' style={style} />)).toBe(
      await render(<input type='reset' value='Reset' style={style} />)
    )
    expect(
      await render(<input type='button' value='Go' style={style} />)
    ).not.toBe(await render(<input type='button' style={style} />))
    expect(
      await toImage(
        await render(
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input type='submit' value='Google Search' style={style} />
            <input type='button' value="I'm Feeling Lucky" style={style} />
          </div>
        ),
        200
      )
    ).toMatchImageSnapshot()
  })

  it('should size inputs like browsers', async () => {
    const boxes: Record<string, { width: number; height: number }> = {}
    await satori(
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'block', height: 40 }}>
          <input id='default' placeholder='Email' style={{ height: '100%' }} />
        </div>
        <div style={{ display: 'block' }}>
          <input id='size' size={10} />
        </div>
      </div>,
      {
        width: 400,
        height: 100,
        fonts,
        onNodeDetected: (node) => {
          if (node.type === 'input') boxes[node.props.id] = node
          expect(Object.keys(node.props)).not.toContain('__satoriPlaceholder')
        },
      }
    )
    // `size` characters wide, 20 by default.
    expect(boxes.default.width).toBeGreaterThan(100)
    expect(boxes.size.width).toBeCloseTo(boxes.default.width / 2, -1)
    // Percentages of heights are of the definite height of the container.
    expect(boxes.default.height).toBe(40)
  })

  it('should render styled inputs', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 10,
          fontSize: 14,
        }}
      >
        <input
          placeholder='you@domain.com'
          style={{
            boxSizing: 'border-box',
            width: 180,
            height: 32,
            padding: '0 12px',
            border: '1px solid #ccc',
            borderRadius: 6,
          }}
        />
        <input
          value='Satori'
          style={{
            boxSizing: 'border-box',
            width: 180,
            height: 32,
            padding: '0 12px',
            background: '#eee',
            borderRadius: 6,
            textAlign: 'center',
          }}
        />
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })
})
