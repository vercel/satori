import { loadEmoji, getIconCode } from './twemoji'

// @TODO: Support font style and weights, and make this option extensible rather
// than built-in.
// @TODO: Cover most languages with Noto Sans.
// @TODO: Fix CJK missing punctuations, maybe inline guessLanguage?
const languageFontMap = {
    zh: 'Noto+Sans+SC',
    ja: 'Noto+Sans+JP',
    ko: 'Noto+Sans+KR',
    th: 'Noto+Sans+Thai',
    unknown: 'Noto+Sans',
  }
  
  function withCache(fn) {
    const cache = new Map()
    return async (...args) => {
      const key = args.join('|')
      if (cache.has(key)) return cache.get(key)
      const result = await fn(...args)
      cache.set(key, result)
      return result
    }
  }
export const loadAdditionalAsset = withCache(async (code, text) => {
    if (code === 'emoji') {
      // It's an emoji, load the image.
      return (
        `data:image/svg+xml;base64,` +
        btoa(await (await loadEmoji(getIconCode(text))).text())
      )
    }
  
    // Try to load from Google Fonts.
    if (!languageFontMap[code]) code = 'unknown'
  
    try {
      const data = await (
        await fetch(
          `/api/font?font=${encodeURIComponent(
            languageFontMap[code]
          )}&text=${encodeURIComponent(text)}`
        )
      ).arrayBuffer()
  
      if (data) {
        return {
          name: `satori_${code}_fallback_${text}`,
          data,
          weight: 400,
          style: 'normal',
        }
      }
    } catch (e) {
      console.error('Failed to load dynamic font for', text, '. Error:', e)
    }
  })