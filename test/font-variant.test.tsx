import { it, describe, expect } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

const row = (label: string, style: Record<string, string>, text: string) => (
  <div style={{ display: 'flex', fontSize: 16, height: 26 }}>
    <div style={{ width: 150, fontSize: 10, color: '#888' }}>{label}</div>
    <div style={style}>{text}</div>
  </div>
)

describe('Font variants', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should apply the OpenType features of font variants', async () => {
    const svg = await satori(
      <div style={{ padding: 4 }}>
        {row('normal', {}, 'Hello World 0123 1/2 fi ffl')}
        {row('small-caps', { fontVariantCaps: 'small-caps' }, 'Hello World')}
        {row(
          'all-small-caps',
          { fontVariantCaps: 'all-small-caps' },
          'Hello World'
        )}
        {row(
          'oldstyle-nums',
          { fontVariantNumeric: 'oldstyle-nums' },
          '0123456789'
        )}
        {row(
          'diagonal-fractions',
          { fontVariantNumeric: 'diagonal-fractions' },
          '1/2 3/4 5/8'
        )}
        {row('kerning none', { fontKerning: 'none' }, 'AVATAR WAVE To Ty')}
        {row(
          'ligatures none',
          { fontVariantLigatures: 'none' },
          'fi ffl office'
        )}
        {row(
          'feature settings',
          { fontVariantCaps: 'small-caps', fontFeatureSettings: '"smcp" 0' },
          'Hello World'
        )}
        <div style={{ fontVariant: 'small-caps oldstyle-nums', fontSize: 16 }}>
          Inherited <span>Small Caps 0123</span>
        </div>
      </div>,
      { width: 400, height: 250, fonts }
    )
    expect(await toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('should support positions and ordinals', async () => {
    const geist = await readFile(
      join(process.cwd(), 'test', 'assets', 'Geist-Regular.ttf')
    )
    const svg = await satori(
      <div style={{ padding: 4 }}>
        {row('super', { fontVariantPosition: 'super' }, 'x2 H2O')}
        {row('sub', { fontVariantPosition: 'sub' }, 'x2 H2O')}
        {row('ordinal', { fontVariantNumeric: 'ordinal' }, '1st 2nd 3a 4o')}
      </div>,
      {
        width: 300,
        height: 90,
        fonts: [{ name: 'Geist', data: geist, weight: 400, style: 'normal' }],
      }
    )
    expect(await toImage(svg, 300)).toMatchImageSnapshot()
  })

  it('should throw for invalid values', async () => {
    for (const style of [
      { fontVariant: 'small-caps big' },
      { fontVariantCaps: 'tiny-caps' },
      { fontVariantNumeric: 'none' },
      { fontKerning: 'off' },
    ]) {
      await expect(
        satori(<div style={style as any}>x</div>, {
          width: 100,
          height: 100,
          fonts,
        })
      ).rejects.toThrowError(/Invalid `font(Variant|Kerning)/)
    }
  })
})
