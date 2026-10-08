import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import { getMarkerText } from '../src/counter-styles.js'
import { getReversedStart } from '../src/list-marker.js'

// A 10x6 red rectangle.
const IMAGE =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="6"><rect width="10" height="6" fill="red"/></svg>'
  ).toString('base64')

describe('List', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should draw markers of lists', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 10 }}>
        <div>
          <ul>
            <li>One</li>
            <li style={{ color: 'red', fontSize: 24 }}>Two</li>
            <li>
              Three
              {/* Nested lists have other markers and no margins. */}
              <ul>
                <li>Nested</li>
                <li>
                  More
                  <ul>
                    <li>Deep</li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </div>
        <div>
          <ol>
            <li>One</li>
            <li>Two</li>
            <li>
              Three
              <ol>
                <li>Nested</li>
                <li>Nested</li>
              </ol>
            </li>
          </ol>
          <ol start={9}>
            <li>Nine</li>
            <li>Ten</li>
          </ol>
        </div>
      </div>,
      { width: 400, height: 260, fonts }
    )
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('should support the attributes of lists', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 10 }}>
        <ol reversed>
          <li>A</li>
          <li>B</li>
          <li>C</li>
        </ol>
        <ol reversed start={10}>
          <li>A</li>
          <li>B</li>
        </ol>
        <ol type='a'>
          <li>A</li>
          <li value={5}>B</li>
          <li>C</li>
        </ol>
        <ol type='I'>
          <li>A</li>
          <li>B</li>
          <li>C</li>
          <li>D</li>
        </ol>
      </div>,
      { width: 400, height: 140, fonts }
    )
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('should reset, increment and set counters', async () => {
    const item = { display: 'list-item', listStyleType: 'decimal' }
    const svg = await satori(
      <div style={{ paddingLeft: 40, counterReset: 'list-item 3' }}>
        <div style={item}>Four</div>
        <div style={{ ...item, counterIncrement: 'list-item 5' }}>Nine</div>
        <div style={{ ...item, counterSet: 'list-item 100' }}>Hundred</div>
        <div style={{ ...item, counterReset: 'list-item' }}>One</div>
        {/* Not displayed, so it doesn't increment the counter. */}
        <div style={{ ...item, display: 'none' }}>Hidden</div>
        <div style={item}>Two</div>
      </div>,
      { width: 200, height: 110, fonts }
    )
    expect(await toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should support counter styles and strings', async () => {
    const types = [
      'decimal-leading-zero',
      'lower-roman',
      'upper-alpha',
      'lower-greek',
      '"- "',
      'none',
      'square',
      'circle',
      'disclosure-open',
      'disclosure-closed',
    ]
    const svg = await satori(
      <div style={{ display: 'flex', flexWrap: 'wrap', paddingLeft: 50 }}>
        {types.map((type) => (
          <ul
            key={type}
            style={{
              listStyleType: type,
              width: 90,
              margin: 0,
              padding: 0,
              marginLeft: 30,
            }}
          >
            <li style={{ counterIncrement: 'list-item 13' }}>
              {type.slice(0, 7)}
            </li>
          </ul>
        ))}
      </div>,
      { width: 420, height: 120, fonts }
    )
    expect(await toImage(svg, 420)).toMatchImageSnapshot()
  })

  it('should draw markers inside, in the first line, and images', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 10 }}>
        <ul style={{ listStylePosition: 'inside', width: 120, padding: 0 }}>
          <li>Inside disc that wraps to a second line</li>
          <li style={{ listStyle: 'decimal inside' }}>Inside decimal</li>
        </ul>
        <ul style={{ width: 140 }}>
          {/* In the first line of the first block. */}
          <li>
            <p style={{ margin: 0, color: 'blue', fontSize: 20 }}>Para first</p>
            after
          </li>
          {/* In the first line of the first flex item. */}
          <li>
            <div style={{ display: 'flex', gap: 4 }}>
              <span>flex</span>
              <span>child</span>
            </div>
          </li>
          <li style={{ listStyleImage: `url('${IMAGE}')` }}>Image</li>
          <li style={{ listStyle: `url('${IMAGE}') inside` }}>Image in</li>
        </ul>
      </div>,
      { width: 400, height: 230, fonts }
    )
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('should size and place markers by the font', async () => {
    const types = [
      'disc',
      'circle',
      'square',
      'decimal',
      'lower-roman',
      'disclosure-closed',
    ]
    const svg = await satori(
      <div style={{ display: 'flex', gap: 10 }}>
        {types.map((type) => (
          <ul
            key={type}
            style={{
              listStyleType: type,
              width: 38,
              paddingLeft: 30,
              flexShrink: 0,
            }}
          >
            {[12, 16, 20, 27].map((size) => (
              <li
                key={size}
                style={{ fontSize: size, counterIncrement: 'list-item 7' }}
              >
                xx
              </li>
            ))}
            <li style={{ listStylePosition: 'inside' }}>xx</li>
          </ul>
        ))}
      </div>,
      { width: 420, height: 200, fonts }
    )
    expect(await toImage(svg, 420)).toMatchImageSnapshot()
  })

  it('should format counters', () => {
    expect(getMarkerText(3, 'decimal')).toBe('3. ')
    expect(getMarkerText(-3, 'decimal-leading-zero')).toBe('-03. ')
    expect(getMarkerText(1994, 'upper-roman')).toBe('MCMXCIV. ')
    expect(getMarkerText(28, 'lower-alpha')).toBe('ab. ')
    expect(getMarkerText(15, 'hebrew')).toBe('טו. ')
    expect(getMarkerText(12, 'cjk-decimal')).toBe('一二、')
    expect(getMarkerText(2, 'disc')).toBe('• ')
    expect(getMarkerText(2, '"→ "')).toBe('→ ')
    // Out of range values and unknown styles are `decimal`.
    expect(getMarkerText(0, 'lower-roman')).toBe('0. ')
    expect(getMarkerText(4000, 'upper-roman')).toBe('4000. ')
    expect(getMarkerText(5, 'unknown-style')).toBe('5. ')
  })

  it('should count the items of reversed lists', () => {
    const li = (props = {}) => ({ type: 'li', props })
    expect(getReversedStart([li(), li(), li()] as any, 'list-item')).toBe(4)
    // A value ends the count.
    expect(
      getReversedStart([li(), li({ value: 10 }), li()] as any, 'list-item')
    ).toBe(12)
    // Items of nested lists are counted by them.
    expect(
      getReversedStart(
        [
          li({ children: [{ type: 'ol', props: { children: [li()] } }] }),
          li(),
        ] as any,
        'list-item'
      )
    ).toBe(3)
  })
})
