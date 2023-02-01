import { it, describe, expect } from 'vitest'

import { detectLanguageCode } from '../src/language'

describe('detectLanguageCode', () => {
  it('should detect emoji', async () => {
    expect(detectLanguageCode('🔺')).toBe('emoji')
    expect(detectLanguageCode('😀')).toBe('emoji')
    expect(detectLanguageCode('㊗️')).toBe('emoji')
    expect(detectLanguageCode('🧑🏻‍💻')).toBe('emoji')
    expect(detectLanguageCode('hello 🌍')).toBe('emoji')
    expect(detectLanguageCode('👋 vs 🌊')).toBe('emoji')
  })

  it('should detect japanese(hiragana)', async () => {
    expect(detectLanguageCode('こんにちは')).toBe('ja-JP')
  })

  it('should detect japanese(katakana)', async () => {
    expect(detectLanguageCode('ハナミズキ')).toBe('ja-JP')
  })

  it('should detect japanese（kanji)', async () => {
    expect(detectLanguageCode('桜')).toBe('ja-JP')
  })

  it('should detect japanese(hiragana) when locale is zh', async () => {
    expect(detectLanguageCode('こんにちは')).toBe('ja-JP')
  })

  it('should detect japanese(katakana) when locale is zh', async () => {
    expect(detectLanguageCode('ハナミズキ')).toBe('ja-JP')
  })

  it('should detect simplified chinese when locale is zh-cn', async () => {
    expect(detectLanguageCode('我知道怎么说中文', 'zh-CN')).toBe('zh-CN')
  })

  it('should detect traditional chinese when locale is zh-cn', async () => {
    expect(detectLanguageCode('我知道怎麼說中文', 'zh-CN')).toBe('zh-CN')
  })

  it('should detect traditional chinese when locale is zh-tw', async () => {
    expect(detectLanguageCode('我知道怎麼說中文', 'zh-TW')).toBe('zh-TW')
  })

  it('should detect korean', async () => {
    expect(detectLanguageCode('안녕하세요')).toBe('ko-KR')
  })

  it('should detect thai', async () => {
    expect(detectLanguageCode('สวัสดี')).toBe('th-TH')
  })

  it('should detect arabic', async () => {
    expect(detectLanguageCode('مرحبا')).toBe('ar-AR')
  })

  it('should detect tamil', async () => {
    expect(detectLanguageCode('வணக்கம்')).toBe('ta-IN')
  })

  it('should detect bengali', async () => {
    expect(detectLanguageCode('হ্যালো')).toBe('bn-IN')
  })

  it('should detect malayalam', async () => {
    expect(detectLanguageCode('ഹായ്')).toBe('ml-IN')
  })

  it('should detect hebrew', async () => {
    expect(detectLanguageCode('שלום')).toBe('he-IL')
  })

  it('should detect telegu', async () => {
    expect(detectLanguageCode('హలో')).toBe('te-IN')
  })

  it('should detect devanagari', async () => {
    expect(detectLanguageCode('नमस्ते')).toBe('devanagari')
  })

  it('should detect unknown', async () => {
    expect(detectLanguageCode('wat')).toBe('unknown')
  })

  it('should detect math', async () => {
    expect(detectLanguageCode('ℵ')).toBe('math')
  })

  it('should detect symbol', async () => {
    expect(detectLanguageCode('☻')).toBe('symbol')
  })
})
