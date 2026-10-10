import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'
import { processTextTransform } from '../src/text/processor.js'

describe('textTransform', () => {
  let fonts
  initFonts((f) => (fonts = f))

  it('should put text in full-width forms', () => {
    expect(processTextTransform('Hello, World! 123', 'full-width')).toBe(
      'Ｈｅｌｌｏ，　Ｗｏｒｌｄ！　１２３'
    )
    // Halfwidth forms are replaced by their full-width forms, and the voiced
    // sound mark is a combining one.
    expect(processTextTransform('¥¯₩ ｱｶﾞﾊﾟｰ｡ ﾠﾡ', 'full-width')).toBe(
      '￥￣￦　アカ\u3099ハ\u309aー。　ㅤㄱ'
    )
    expect(processTextTransform('ＡＢ　漢字かな', 'full-width')).toBe(
      'ＡＢ　漢字かな'
    )
  })

  it('should make small kana full-size', () => {
    expect(
      processTextTransform(
        'ぁぃっゎァヵㇰㇿｧｯ\u{1b132}\u{1b167}',
        'full-size-kana'
      )
    ).toBe('あいつわアカクロｱﾂこン')
  })

  it('should combine keywords in order', () => {
    expect(processTextTransform('hello world', 'capitalize full-width')).toBe(
      'Ｈｅｌｌｏ　Ｗｏｒｌｄ'
    )
    expect(
      processTextTransform('abc ぁ', 'full-size-kana uppercase full-width')
    ).toBe('ＡＢＣ　あ')
  })

  it('should transform text with and without inline elements', async () => {
    for (const element of [
      <div style={{ textTransform: 'full-width' }}>ab 12</div>,
      <div style={{ textTransform: 'full-width' }}>
        ab <span>12</span>
      </div>,
    ]) {
      const svg = await satori(element, {
        width: 200,
        height: 50,
        fonts,
        embedFont: false,
      })
      expect(svg.replace(/<[^>]*>/g, '')).toContain('ａｂ')
      expect(svg.replace(/<[^>]*>/g, '')).toContain('１２')
    }
  })
})
