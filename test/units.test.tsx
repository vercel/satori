import { it, describe, expect } from 'vitest'
import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

describe('Units', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should convert absolute lengths and viewport units', async () => {
    const box = (width: string, color: string) => (
      <div style={{ width, height: 10, background: color, marginBottom: 2 }} />
    )
    const svg = await satori(
      <div style={{ display: 'flex', flexDirection: 'column', padding: 4 }}>
        {box('1in', 'red')}
        {box('2.54cm', 'orange')}
        {box('25.4mm', 'gold')}
        {box('72pt', 'green')}
        {box('6pc', 'teal')}
        {box('101.6q', 'blue')}
        {box('25vmin', 'purple')}
        {box('25vmax', 'black')}
      </div>,
      { width: 200, height: 100, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })

  it('should resolve font size keywords and percentages', async () => {
    const svg = await satori(
      <div style={{ fontSize: 16, padding: 4 }}>
        <div style={{ fontSize: 'x-large' }}>x-large</div>
        <div style={{ fontSize: 'small' }}>small</div>
        <div style={{ fontSize: 'larger' }}>
          larger <span style={{ fontSize: 'smaller' }}>smaller</span>
        </div>
        <div style={{ fontSize: '150%' }}>150%</div>
        <div style={{ fontSize: '12pt' }}>12pt</div>
      </div>,
      { width: 200, height: 160, fonts }
    )
    expect(toImage(svg, 200)).toMatchImageSnapshot()
  })
})
