import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'
import {
  expandGrid,
  expandGridPlacement,
  expandGridTemplate,
  parseGridLine,
  parseGridTemplateAreas,
  parseGridTrackList,
} from '../src/parser/grid.js'

const colors = [
  '#e11d48',
  '#2563eb',
  '#16a34a',
  '#9333ea',
  '#ea580c',
  '#0891b2',
]

function Cell({ i = 0, style, children }: any) {
  return (
    <div
      style={{
        background: colors[i % colors.length],
        color: 'white',
        fontSize: 14,
        padding: 4,
        ...style,
      }}
    >
      {children ?? String(i + 1)}
    </div>
  )
}

const cells = (count: number) =>
  Array.from({ length: count }, (_, i) => <Cell key={i} i={i} />)

describe('grid', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const render = async (element: any, width = 200, height = 150) =>
    toImage(await satori(element, { width, height, fonts }), width)

  it('should size fixed, flexible and auto tracks', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateColumns: '50px 1fr 2fr',
          gridTemplateRows: '30px auto 1fr',
          gap: '8px 4px',
          padding: 6,
          background: '#eee',
        }}
      >
        <Cell i={0}>50px</Cell>
        <Cell i={1}>1fr</Cell>
        <Cell i={2}>2fr</Cell>
        <Cell i={3}>auto row that wraps</Cell>
        <Cell i={4} />
        <Cell i={5} />
        <Cell i={0}>1fr</Cell>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should repeat tracks', async () => {
    const image = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          gap: 8,
          padding: 6,
          background: '#eee',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 4,
          }}
        >
          {cells(3)}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 20px 1fr)',
            gap: 4,
          }}
        >
          {cells(4)}
        </div>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should repeat tracks with auto-fill and auto-fit', async () => {
    const image = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          gap: 8,
          padding: 6,
          background: '#eee',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
            gridAutoRows: '24px',
            gap: 4,
          }}
        >
          {cells(6)}
        </div>
        {/* Empty repeated tracks are kept by auto-fill and collapsed by
            auto-fit. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
            gap: 4,
          }}
        >
          {cells(2)}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(40px, 1fr))',
            gap: 4,
          }}
        >
          {cells(2)}
        </div>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should place items by line numbers and spans', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: 4,
          padding: 4,
          background: '#eee',
        }}
      >
        <Cell i={0} style={{ gridColumn: '1 / 3' }}>
          1 / 3
        </Cell>
        <Cell i={1} style={{ gridRow: 'span 2' }}>
          span 2
        </Cell>
        <Cell i={2} style={{ gridColumn: '2 / -1', gridRow: 3 }}>
          2 / -1
        </Cell>
        <Cell
          i={3}
          style={{ gridColumnStart: 4, gridRowStart: 1, gridRowEnd: 'span 2' }}
        >
          4
        </Cell>
        <Cell i={4}>auto</Cell>
        <Cell i={5} style={{ gridArea: '2 / 2 / 3 / 3' }}>
          area
        </Cell>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should place items in named areas', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateAreas: '"header header" "sidebar main" "footer footer"',
          gridTemplateColumns: '60px 1fr',
          gridTemplateRows: '30px 1fr 24px',
          gap: 4,
          padding: 4,
          background: '#eee',
        }}
      >
        <Cell i={5} style={{ gridArea: 'footer' }}>
          footer
        </Cell>
        <Cell i={0} style={{ gridArea: 'header' }}>
          header
        </Cell>
        <Cell i={1} style={{ gridArea: 'main' }}>
          main
        </Cell>
        <Cell i={2} style={{ gridArea: 'sidebar' }}>
          sidebar
        </Cell>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should place items by line names', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateColumns:
            '[full-start] 1fr [content-start] repeat(2, [col] 1fr) [content-end] 1fr [full-end]',
          gridAutoRows: 'min-content',
          rowGap: 4,
          padding: 4,
          background: '#eee',
        }}
      >
        <Cell i={0} style={{ gridColumn: 'full' }}>
          full
        </Cell>
        <Cell i={1} style={{ gridColumn: 'content' }}>
          content
        </Cell>
        <Cell i={2} style={{ gridColumn: 'col 2 / full-end' }}>
          col 2 / full-end
        </Cell>
        <Cell i={3} style={{ gridColumn: 'span 2 / content-end' }}>
          span 2
        </Cell>
        <Cell i={4} style={{ gridColumn: 'full-start / span col 2' }}>
          span col 2
        </Cell>
      </div>,
      200,
      180
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should flow items in columns and fill holes densely', async () => {
    const image = await render(
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          gap: 8,
          padding: 4,
          background: '#eee',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridTemplateRows: 'repeat(3, 30px)',
            gridAutoColumns: '30px',
            gap: 4,
          }}
        >
          {cells(5)}
        </div>
        <div
          style={{
            display: 'grid',
            gridAutoFlow: 'dense',
            gridTemplateColumns: 'repeat(3, 30px)',
            gridAutoRows: '30px',
            gap: 4,
          }}
        >
          <Cell i={0} />
          <Cell i={1} style={{ gridColumn: 'span 3' }} />
          <Cell i={2} style={{ gridColumn: 'span 2' }} />
          <Cell i={3} />
          <Cell i={4} />
        </div>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should size implicit tracks', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateColumns: '1fr 1fr',
          gridAutoRows: 'minmax(30px, auto)',
          gridAutoColumns: '40px',
          gap: 4,
          padding: 4,
          background: '#eee',
        }}
      >
        <Cell i={0} />
        <Cell i={1}>An implicit row that grows with its content</Cell>
        <Cell i={2} style={{ gridColumn: 3 }}>
          3
        </Cell>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should size tracks to their content', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          gridTemplateColumns: 'min-content max-content fit-content(60px) 1fr',
          gap: 4,
          padding: 4,
          background: '#eee',
        }}
      >
        <Cell i={0}>min content</Cell>
        <Cell i={1}>max content</Cell>
        <Cell i={2}>fit content up to 60px</Cell>
        <Cell i={3}>1fr</Cell>
      </div>,
      300,
      100
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should align items and tracks', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateColumns: 'repeat(3, 50px)',
          gridTemplateRows: 'repeat(2, 50px)',
          justifyContent: 'space-between',
          alignContent: 'center',
          justifyItems: 'center',
          alignItems: 'end',
          gap: 4,
          background: '#eee',
        }}
      >
        <Cell i={0} />
        <Cell i={1} style={{ justifySelf: 'stretch' }}>
          stretch
        </Cell>
        <Cell i={2} style={{ alignSelf: 'start' }} />
        <Cell i={3} style={{ justifySelf: 'end', alignSelf: 'center' }} />
        <Cell i={4} style={{ justifySelf: 'start', alignSelf: 'stretch' }} />
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should stretch auto tracks by default', async () => {
    const grid = (style: any) => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto auto',
          gridTemplateRows: '30px',
          gap: 4,
          background: '#ccc',
          ...style,
        }}
      >
        {cells(2)}
      </div>
    )
    const image = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          gap: 8,
          padding: 4,
          background: '#eee',
        }}
      >
        {grid({})}
        {grid({ justifyContent: 'start' })}
        {grid({ justifyContent: 'center' })}
        {grid({ justifyContent: 'end' })}
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should lay out content in grid items', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          padding: 6,
          alignItems: 'start',
          background: '#fff',
        }}
      >
        <div
          style={{
            display: 'block',
            background: '#f1f5f9',
            padding: 6,
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700 }}>Block</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
            Text wraps inside each cell.
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: '#f1f5f9',
            padding: 6,
            borderRadius: 6,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: 10,
              flexShrink: 0,
              background: '#6366f1',
            }}
          />
          <div style={{ fontSize: 11, marginLeft: 4 }}>A flex item</div>
        </div>
        <img
          src='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20"><rect width="40" height="20" fill="%2316a34a"/></svg>'
          style={{ width: '100%' }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 2,
          }}
        >
          {cells(6)}
        </div>
        <Cell i={3} style={{ gridColumn: 'span 2', fontSize: 12 }}>
          Spanning both columns
        </Cell>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should resolve percentages and relative lengths', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          fontSize: 8,
          gridTemplateColumns: '20% 6em 1fr',
          gridTemplateRows: '4em minmax(20px, 20%) 1fr',
          gap: '1em 5%',
          padding: '1em',
          background: '#eee',
        }}
      >
        {cells(6)}
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should position absolute children in the grid', async () => {
    const image = await render(
      <div
        style={{
          display: 'grid',
          width: '100%',
          height: '100%',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          padding: 10,
          background: '#eee',
        }}
      >
        {cells(4)}
        <Cell
          i={5}
          style={{ position: 'absolute', right: 0, bottom: 0, width: 40 }}
        >
          abs
        </Cell>
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should support start and end alignment in flex containers', async () => {
    const row = (style: any) => (
      <div
        style={{
          display: 'flex',
          height: 30,
          background: '#ccc',
          ...style,
        }}
      >
        {cells(2)}
      </div>
    )
    const image = await render(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          gap: 8,
          padding: 4,
          background: '#eee',
        }}
      >
        {row({ justifyContent: 'start', alignItems: 'start' })}
        {row({ justifyContent: 'end', alignItems: 'end' })}
        {row({ justifyContent: 'left', alignItems: 'self-end' })}
        {row({ justifyContent: 'right', alignItems: 'self-start' })}
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should support two gap values in flex containers', async () => {
    const image = await render(
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          width: '100%',
          height: '100%',
          gap: '20px 4px',
          padding: 4,
          alignContent: 'flex-start',
          background: '#eee',
        }}
      >
        {Array.from({ length: 8 }, (_, i) => (
          <Cell key={i} i={i} style={{ width: 40, height: 30 }} />
        ))}
      </div>
    )
    expect(image).toMatchImageSnapshot()
  })

  it('should throw for invalid values', async () => {
    const invalid: [string, string][] = [
      ['gridTemplateColumns', 'repeat(0, 1fr)'],
      ['gridTemplateColumns', 'minmax(1fr, 10px)'],
      ['gridTemplateColumns', '1fr [a'],
      ['gridTemplateColumns', 'repeat(auto-fill, 10px) repeat(auto-fit, 10px)'],
      ['gridTemplateColumns', 'repeat(2, repeat(2, 1fr))'],
      ['gridTemplateColumns', '-10px'],
      ['gridAutoRows', 'repeat(2, 10px)'],
      ['gridAutoFlow', 'row column'],
      ['gridTemplateAreas', '"a b" "b a"'],
      ['gridTemplateAreas', '"a b" "c"'],
      ['gridColumn', '0'],
      ['gridColumn', 'span 0'],
      ['gridColumn', '1 / 2 / 3'],
      ['gridRowStart', 'span'],
      ['gap', '1px 2px 3px'],
    ]
    for (const [property, value] of invalid) {
      await expect(
        satori(<div style={{ display: 'grid', [property]: value }} />, {
          width: 100,
          height: 100,
          fonts,
        }),
        `${property}: ${value}`
      ).rejects.toThrow()
    }
  })
})

describe('grid parser', () => {
  const resolveLength = (value: string) =>
    /^\d+px$/.test(value) ? parseFloat(value) : undefined

  it('should parse track lists', () => {
    expect(
      parseGridTrackList(
        '[a] 10px repeat(2, [b] minmax(min-content, 1fr)) fit-content(20%) [c d]',
        resolveLength,
        'gridTemplateColumns'
      )
    ).toEqual({
      tracks: [
        { min: 10, max: 10 },
        {
          count: 2,
          tracks: [{ min: 'min-content', max: '1fr' }],
          lineNames: [['b'], []],
        },
        { min: 'auto', max: { fitContent: '20%' } },
      ],
      lineNames: [['a'], [], [], ['c', 'd']],
    })
    expect(
      parseGridTrackList('auto 2fr', resolveLength, 'gridTemplateColumns')
    ).toEqual({
      tracks: [
        { min: 'auto', max: 'auto' },
        { min: 'auto', max: '2fr' },
      ],
      lineNames: [],
    })
    expect(
      parseGridTrackList('none', resolveLength, 'gridTemplateColumns')
    ).toBeUndefined()
  })

  it('should parse grid lines', () => {
    expect(parseGridLine('auto', 'p')).toBe('auto')
    expect(parseGridLine(-1, 'p')).toEqual({ line: -1 })
    expect(parseGridLine('2 a', 'p')).toEqual({ line: 2, name: 'a' })
    expect(parseGridLine('a', 'p')).toEqual({ line: 0, name: 'a' })
    expect(parseGridLine('span 3', 'p')).toEqual({ span: 3 })
    expect(parseGridLine('a span', 'p')).toEqual({ span: 1, name: 'a' })
  })

  it('should expand placement shorthands', () => {
    expect(expandGridPlacement('gridColumn', 'a')).toEqual({
      gridColumnStart: 'a',
      gridColumnEnd: 'a',
    })
    expect(expandGridPlacement('gridRow', '2')).toEqual({
      gridRowStart: '2',
      gridRowEnd: 'auto',
    })
    expect(expandGridPlacement('gridArea', 'a / 2')).toEqual({
      gridRowStart: 'a',
      gridColumnStart: '2',
      gridRowEnd: 'a',
      gridColumnEnd: 'auto',
    })
  })

  it('should parse template areas', () => {
    expect(parseGridTemplateAreas(`"a a ." 'b c c'`)).toEqual({
      rowCount: 2,
      columnCount: 3,
      areas: [
        { name: 'a', rowStart: 1, rowEnd: 2, columnStart: 1, columnEnd: 3 },
        { name: 'b', rowStart: 2, rowEnd: 3, columnStart: 1, columnEnd: 2 },
        { name: 'c', rowStart: 2, rowEnd: 3, columnStart: 2, columnEnd: 4 },
      ],
    })
  })
})

describe('grid shorthands', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should support grid and grid-template', async () => {
    const svg = await satori(
      <div style={{ display: 'flex', gap: 10 }}>
        <div
          style={{
            display: 'grid',
            width: 100,
            gridTemplate: '"a a" 40px "b c" 30px / 40px 1fr',
            gap: 2,
          }}
        >
          <Cell i={0} style={{ gridArea: 'a' }} />
          <Cell i={1} style={{ gridArea: 'b' }} />
          <Cell i={2} style={{ gridArea: 'c' }} />
        </div>
        <div
          style={{
            display: 'grid',
            width: 100,
            grid: 'auto-flow / 30px 50px',
            gap: 2,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <Cell key={i} i={i} style={{ height: 20 }} />
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            width: 100,
            height: 60,
            grid: '20px 30px / auto-flow 25px',
            gap: 2,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Cell key={i} i={i} />
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            width: 90,
            gridTemplate: '[top] 30px [mid] 40px [bot] / 1fr 2fr',
          }}
        >
          <Cell i={4} style={{ gridRow: 'mid / bot' }} />
          <Cell i={5} style={{ gridRow: 'top / mid', gridColumn: 2 }} />
        </div>
      </div>,
      { width: 420, height: 110, fonts }
    )
    expect(toImage(svg, 420)).toMatchImageSnapshot()
  })

  it('should expand grid-template', () => {
    expect(expandGridTemplate('none')).toEqual({
      gridTemplateRows: 'none',
      gridTemplateColumns: 'none',
      gridTemplateAreas: 'none',
    })
    expect(expandGridTemplate('100px 1fr / repeat(2, 50px)')).toEqual({
      gridTemplateRows: '100px 1fr',
      gridTemplateColumns: 'repeat(2, 50px)',
      gridTemplateAreas: 'none',
    })
    expect(
      expandGridTemplate(
        '[header-start] "a a" 30px [header-end] "b c" / auto 1fr'
      )
    ).toEqual({
      gridTemplateRows: '[header-start] 30px [header-end] auto',
      gridTemplateColumns: 'auto 1fr',
      gridTemplateAreas: '"a a" "b c"',
    })
    expect(() => expandGridTemplate('100px 1fr')).toThrow()
    expect(() => expandGridTemplate('"a" / "b"')).toThrow()
  })

  it('should expand grid', () => {
    expect(expandGrid('auto-flow dense 40px / 1fr 1fr')).toEqual({
      gridTemplateRows: 'none',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateAreas: 'none',
      gridAutoFlow: 'row dense',
      gridAutoRows: '40px',
      gridAutoColumns: 'auto',
    })
    expect(expandGrid('100px / auto-flow')).toEqual({
      gridTemplateRows: '100px',
      gridTemplateColumns: 'none',
      gridTemplateAreas: 'none',
      gridAutoFlow: 'column',
      gridAutoRows: 'auto',
      gridAutoColumns: 'auto',
    })
    expect(expandGrid('"a b" 20px / 1fr 2fr')).toEqual({
      gridTemplateRows: '20px',
      gridTemplateColumns: '1fr 2fr',
      gridTemplateAreas: '"a b"',
      gridAutoFlow: 'row',
      gridAutoRows: 'auto',
      gridAutoColumns: 'auto',
    })
    expect(() => expandGrid('auto-flow / auto-flow')).toThrow()
    expect(() => expandGrid('auto-flow 1fr')).toThrow()
  })
})
