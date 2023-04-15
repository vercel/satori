type UnicodeRange = Array<number | number[]>

export class FontDetector {
  private rangesByLang: {
    [font: string]: UnicodeRange
  } = {}

  public async detect(
    text: string,
    fonts: string[]
  ): Promise<{
    [lang: string]: string
  }> {
    await this.load(fonts)

    const result: {
      [lang: string]: string
    } = {}

    for (const segment of text) {
      const lang = this.detectSegment(segment, fonts)
      if (lang) {
        result[lang] = result[lang] || ''
        result[lang] += segment
      }
    }

    return result
  }

  private detectSegment(segment: string, fonts: string[]): string | null {
    for (const font of fonts) {
      const range = this.rangesByLang[font]
      if (range && checkSegmentInRange(segment, range)) {
        return font
      }
    }

    return null
  }

  private async load(fonts: string[]): Promise<void> {
    let params = ''

    const existingLang = Object.keys(this.rangesByLang)
    const langNeedsToLoad = fonts.filter((font) => !existingLang.includes(font))

    if (langNeedsToLoad.length === 0) {
      return
    }

    for (const font of langNeedsToLoad) {
      params += `family=${font}&`
    }
    params += 'display=swap'

    const API = `https://fonts.googleapis.com/css2?${params}`

    const fontFace = await (
      await fetch(API, {
        headers: {
          // Make sure it returns TTF.
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
        },
      })
    ).text()

    this.addDetectors(fontFace)
  }

  private addDetectors(input: string) {
    const regex = /font-family:\s*'(.+?)';.+?unicode-range:\s*(.+?);/gms
    const matches = input.matchAll(regex)

    for (const [, _lang, range] of matches) {
      const lang = _lang.replaceAll(' ', '+')
      if (!this.rangesByLang[lang]) {
        this.rangesByLang[lang] = []
      }

      this.rangesByLang[lang].push(...convert(range))
    }
  }
}

function convert(input: string): UnicodeRange {
  return input.split(', ').map((range) => {
    range = range.replaceAll('U+', '')
    const [start, end] = range.split('-').map((hex) => parseInt(hex, 16))

    if (isNaN(end)) {
      return start
    }

    return [start, end]
  })
}

function checkSegmentInRange(segment: string, range: UnicodeRange): boolean {
  const codePoint = segment.codePointAt(0)

  if (!codePoint) return false

  return range.some((val) => {
    if (typeof val === 'number') {
      return codePoint === val
    } else {
      const [start, end] = val
      return start <= codePoint && codePoint <= end
    }
  })
}

// @TODO: Support font style and weights, and make this option extensible rather
// than built-in.
// @TODO: Cover most languages with Noto Sans.
export const languageFontMap = {
  'ja-JP': 'Noto+Sans+JP',
  'ko-KR': 'Noto+Sans+KR',
  'zh-CN': 'Noto+Sans+SC',
  'zh-TW': 'Noto+Sans+TC',
  'zh-HK': 'Noto+Sans+HK',
  'th-TH': 'Noto+Sans+Thai',
  'bn-IN': 'Noto+Sans+Bengali',
  'ar-AR': 'Noto+Sans+Arabic',
  'ta-IN': 'Noto+Sans+Tamil',
  'ml-IN': 'Noto+Sans+Malayalam',
  'he-IL': 'Noto+Sans+Hebrew',
  'te-IN': 'Noto+Sans+Telugu',
  devanagari: 'Noto+Sans+Devanagari',
  kannada: 'Noto+Sans+Kannada',
  symbol: ['Noto+Sans+Symbols', 'Noto+Sans+Symbols+2'],
  math: 'Noto+Sans+Math',
  unknown: 'Noto+Sans',
}
