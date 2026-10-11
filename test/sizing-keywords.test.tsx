import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const box = (style: Record<string, number | string>, text = 'Some words') => (
  <div
    style={{
      background: '#cde',
      border: '2px solid #36c',
      fontSize: 14,
      marginBottom: 4,
      ...style,
    }}
  >
    {text}
  </div>
)

describe('Sizing keywords', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should size blocks to their content', async () => {
    const svg = await satori(
      <div style={{ width: 240, padding: 4, background: '#eee' }}>
        {box({ width: 'min-content' }, 'Some words that wrap')}
        {box({ width: 'max-content' }, 'Some words that wrap')}
        {box({ width: 'fit-content' }, 'Some words that wrap')}
        {box({ width: 'fit-content(100px)' }, 'Some words that wrap')}
        {box({ width: 'fit-content(50%)' }, 'Some words that wrap')}
        {box({ width: 'stretch', marginLeft: 20 }, 'Stretched')}
        {box(
          { width: 'fit-content', padding: '0 10px' },
          'A much longer text that will need to wrap in the box'
        )}
      </div>,
      { width: 260, height: 300, fonts }
    )
    expect(await toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should limit widths to the content', async () => {
    const svg = await satori(
      <div style={{ width: 240, padding: 4, background: '#eee' }}>
        {box({ maxWidth: 'max-content' }, 'max-width max-content')}
        {box({ maxWidth: 'min-content' }, 'max-width min-content')}
        {box({ width: 20, minWidth: 'max-content' }, 'min-width max-content')}
        {box({ maxWidth: 'fit-content(90px)' }, 'max-width fit-content 90px')}
        {box(
          { width: 10, minWidth: 'min-content', padding: '0 12px' },
          'content-box padding'
        )}
        {box(
          {
            width: 10,
            minWidth: 'min-content',
            padding: '0 12px',
            boxSizing: 'border-box',
          },
          'border-box padding'
        )}
      </div>,
      { width: 260, height: 300, fonts }
    )
    expect(await toImage(svg, 260)).toMatchImageSnapshot()
  })

  it('should support content and keywords as flex bases and heights', async () => {
    const svg = await satori(
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 4,
          width: 280,
          background: '#eee',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {box({ flexBasis: 'content', width: 40, flexShrink: 0 }, 'content')}
          {box({ width: 40, flexShrink: 0 }, 'width 40')}
          {box({ flexBasis: 'max-content', flexShrink: 0 }, 'max')}
        </div>
        <div style={{ display: 'flex', width: 200 }}>
          {box({ width: 10, minWidth: 'min-content' }, 'min-width min-content')}
          {box({ width: 300, minWidth: 0 }, 'shrinks')}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', height: 60 }}>
          {box({ height: 'min-content' }, 'min-content')}
          {box({ height: 'stretch', margin: '5px 4px' }, 'stretch')}
          {box({ height: '-webkit-fill-available' }, 'fill')}
        </div>
      </div>,
      { width: 300, height: 220, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should size inline blocks with keywords', async () => {
    const inlineBlock = { display: 'inline-block', background: '#cde' }
    const svg = await satori(
      <div style={{ width: 280, padding: 4, background: '#eee', fontSize: 14 }}>
        a{' '}
        <span style={{ ...inlineBlock, width: 'min-content', margin: '0 6px' }}>
          min content box
        </span>{' '}
        b{' '}
        <span style={{ ...inlineBlock, width: 'max-content', margin: '0 6px' }}>
          max content box here
        </span>{' '}
        c{' '}
        <span style={{ ...inlineBlock, width: 'fit-content' }}>
          fit content
        </span>{' '}
        d{' '}
        <span
          style={{
            ...inlineBlock,
            width: 'fit-content(50px)',
            padding: '0 4px',
          }}
        >
          fit content limited
        </span>{' '}
        e{' '}
        <span
          style={{
            ...inlineBlock,
            width: 'stretch',
            background: '#fdc',
            margin: '0 10px',
          }}
        >
          stretch
        </span>
      </div>,
      { width: 300, height: 130, fonts }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })
})
