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

  it('should detect japanese', async () => {
    expect(detectLanguageCode('こんにちは')).toBe('ja')
  })

  it('should detect korean', async () => {
    expect(detectLanguageCode('안녕하세요')).toBe('ko')
  })

  it('should detect simplified chinese', async () => {
    expect(detectLanguageCode('我知道怎么说中文')).toBe('zh')
  })

  it('should detect traditional chinese', async () => {
    expect(detectLanguageCode('我知道怎麼說中文')).toBe('zh')
  })

  it('should detect thai', async () => {
    expect(detectLanguageCode('สวัสดี')).toBe('th')
  })

  it('should detect arabic', async () => {
    expect(detectLanguageCode('مرحبا')).toBe('ar')
  })

  it('should detect tamil', async () => {
    expect(detectLanguageCode('வணக்கம்')).toBe('ta')
  })

  it('should detect bengali', async () => {
    expect(detectLanguageCode('হ্যালো')).toBe('bn')
  })

  it('should detect malayalam', async () => {
    expect(detectLanguageCode('ഹായ്')).toBe('ml')
  })

  it('should detect hebrew', async () => {
    expect(detectLanguageCode('שלום')).toBe('he')
  })

  it('should detect telegu', async () => {
    expect(detectLanguageCode('హలో')).toBe('te')
  })

  it('should detect devanagari', async () => {
    expect(detectLanguageCode('नमस्ते')).toBe('devanagari')
  })

  it('should detect unknown', async () => {
    expect(detectLanguageCode('wat')).toBe('unknown')
  })
})
