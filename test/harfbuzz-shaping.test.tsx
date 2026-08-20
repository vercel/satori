import { it, describe, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'path'

import { toImage } from './utils.js'
import satori from '../src/index.js'

describe('HarfBuzz Shaping', () => {
  let arabicFonts
  let hebrewFonts
  let mixedFonts
  let latinCjkFonts

  beforeAll(async () => {
    const arabicFontPath = join(
      process.cwd(),
      'test',
      'assets',
      'NotoSansArabic-Regular.ttf'
    )
    const hebrewFontPath = join(
      process.cwd(),
      'test',
      'assets',
      'NotoSansHebrew-Regular.ttf'
    )
    const latinFontPath = join(
      process.cwd(),
      'test',
      'assets',
      'Roboto-Regular.ttf'
    )
    const geistFontPath = join(
      process.cwd(),
      'test',
      'assets',
      'Geist-Regular.ttf'
    )
    const geistMonoFontPath = join(
      process.cwd(),
      'test',
      'assets',
      'GeistMono-Regular.ttf'
    )
    const playfairFontPath = join(
      process.cwd(),
      'test',
      'assets',
      'playfair-display.ttf'
    )
    const japaneseFontPath = join(process.cwd(), 'test', 'assets', 'こんにちは')
    const chineseFontPath = join(process.cwd(), 'test', 'assets', '你好')
    const koreanFontPath = join(process.cwd(), 'test', 'assets', '안녕')

    const arabicFontData = await readFile(arabicFontPath)
    const hebrewFontData = await readFile(hebrewFontPath)
    const latinFontData = await readFile(latinFontPath)
    const geistFontData = await readFile(geistFontPath)
    const geistMonoFontData = await readFile(geistMonoFontPath)
    const playfairFontData = await readFile(playfairFontPath)
    const japaneseFontData = await readFile(japaneseFontPath)
    const chineseFontData = await readFile(chineseFontPath)
    const koreanFontData = await readFile(koreanFontPath)

    arabicFonts = [
      {
        name: 'Noto Sans Arabic',
        data: arabicFontData,
        weight: 400,
        style: 'normal',
      },
    ]

    hebrewFonts = [
      {
        name: 'Noto Sans Hebrew',
        data: hebrewFontData,
        weight: 400,
        style: 'normal',
      },
    ]

    mixedFonts = [
      {
        name: 'Noto Sans Arabic',
        data: arabicFontData,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Roboto',
        data: latinFontData,
        weight: 400,
        style: 'normal',
      },
    ]

    latinCjkFonts = [
      {
        name: 'Geist',
        data: geistFontData,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Geist Mono',
        data: geistMonoFontData,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Playfair Display',
        data: playfairFontData,
        weight: 400,
        style: 'normal',
      },
      {
        name: 'Noto Sans JP',
        data: japaneseFontData,
        weight: 400,
        style: 'normal',
        lang: 'ja-JP',
      },
      {
        name: 'Noto Sans SC',
        data: chineseFontData,
        weight: 400,
        style: 'normal',
        lang: 'zh-CN',
      },
      {
        name: 'Noto Sans KR',
        data: koreanFontData,
        weight: 400,
        style: 'normal',
        lang: 'ko-KR',
      },
    ]
  })

  describe('Latin and CJK shaping', () => {
    it('should render Latin ligatures and kerning across English text', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 24,
            backgroundColor: 'white',
            color: '#111827',
            fontFamily: 'Geist',
            fontSize: 38,
          }}
        >
          <div>office affinity · AVATAR Typography</div>
          <div style={{ fontFeatureSettings: '"liga" off, "kern" off' }}>
            office affinity · AVATAR Typography
          </div>
        </div>,
        { width: 700, height: 140, fonts: latinCjkFonts, embedFont: true }
      )

      expect(toImage(svg, 700)).toMatchImageSnapshot()
    })

    it('should position combining marks over Latin glyphs', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 24,
            backgroundColor: 'white',
            color: '#c026d3',
            fontFamily: 'Geist',
            fontSize: 58,
          }}
        >
          <div>x́ q̈</div>
          <div style={{ fontFeatureSettings: '"mark" off, "mkmk" off' }}>
            x́ q̈
          </div>
        </div>,
        { width: 280, height: 180, fonts: latinCjkFonts, embedFont: true }
      )

      expect(toImage(svg, 280)).toMatchImageSnapshot()
    })

    it('should apply proportional alternates to Japanese glyphs', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: 24,
            backgroundColor: 'white',
            color: '#7c3aed',
            fontFamily: 'Geist',
            fontSize: 44,
          }}
        >
          <div>こんにちは</div>
          <div style={{ fontFeatureSettings: '"palt"' }}>こんにちは</div>
        </div>,
        { width: 420, height: 170, fonts: latinCjkFonts, embedFont: true }
      )

      expect(toImage(svg, 420)).toMatchImageSnapshot()
    })

    it('should compose decomposed Hangul Jamo into syllable glyphs', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            padding: 24,
            backgroundColor: 'white',
            color: '#0369a1',
            fontFamily: 'Geist',
            fontSize: 58,
          }}
        >
          <div>안녕</div>
          <div>안녕</div>
        </div>,
        { width: 360, height: 120, fonts: latinCjkFonts, embedFont: true }
      )

      expect(toImage(svg, 360)).toMatchImageSnapshot()
    })

    it('should preserve shaping across English and CJK font fallbacks', async () => {
      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 20,
            backgroundColor: 'white',
            color: '#be123c',
            fontFamily: 'Geist',
            fontSize: 36,
            letterSpacing: 4,
          }}
        >
          <div>office こんにちは office</div>
          <div>Type 你好 Type</div>
          <div>Hello 안녕 Hello</div>
        </div>,
        { width: 560, height: 190, fonts: latinCjkFonts, embedFont: true }
      )

      expect(toImage(svg, 560)).toMatchImageSnapshot()
    })

    it('showcases HarfBuzz shaping features', async () => {
      const annotationStyle = {
        display: 'flex',
        fontFamily: 'Geist Mono',
        fontSize: 13,
        lineHeight: 1.35,
        color: '#687096',
      } as const

      const svg = await satori(
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 1200,
            height: 630,
            padding: '42px 46px 38px',
            background: '#fdfdf9',
            color: '#17204b',
            fontFamily: 'Geist',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              paddingBottom: 30,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 10,
                  fontSize: 42,
                  lineHeight: 1,
                }}
              >
                <span style={{ fontFamily: 'Geist Mono', fontSize: 40 }}>
                  HarfBuzz
                </span>
                <span>shaping in Satori</span>
              </div>
              <div style={{ marginTop: 18, fontSize: 18, color: '#687096' }}>
                Real OpenType substitutions, positioning, and script shaping
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flex: 1, gap: 18 }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: 524,
                padding: '25px 28px 22px',
                background: '#ff6652',
                border: '1px solid #17204b',
                borderRadius: 40,
                cornerShape: 'squircle',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 17,
                }}
              >
                <span style={{ fontWeight: 700 }}>OpenType substitutions</span>
                <span style={{ fontFamily: 'Geist Mono', fontSize: 13 }}>
                  liga · kern · calt
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 25,
                  fontFamily: 'Geist Mono',
                  fontSize: 13,
                  color: '#4d2944',
                }}
              >
                Features ON
              </div>
              <div
                style={{
                  display: 'flex',
                  marginTop: 9,
                  fontSize: 49,
                  lineHeight: 1,
                  justifyContent: 'center',
                }}
              >
                office AVATAR
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  marginTop: 15,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Geist Mono',
                    fontSize: 29,
                    lineHeight: 1,
                  }}
                >
                  {'-> != ...'}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginTop: 24,
                  paddingTop: 24,
                  borderTop: '1px solid rgba(23, 32, 75, 0.36)',
                  color: '#3d2340',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'Geist Mono',
                    fontSize: 13,
                  }}
                >
                  Features OFF: &quot;liga&quot; off, &quot;kern&quot; off,
                  &quot;calt&quot; off
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    marginTop: 18,
                    fontFeatureSettings: '"liga" off, "kern" off, "calt" off',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 49,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    office AVATAR
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    marginTop: 15,
                    fontFeatureSettings: '"liga" off, "kern" off, "calt" off',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Geist Mono',
                      fontSize: 29,
                      lineHeight: 1,
                    }}
                  >
                    {'-> != ...'}
                  </span>
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                gap: 18,
              }}
            >
              <div style={{ display: 'flex', gap: 18, height: 205 }}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: '22px 24px',
                    background: '#c6ef46',
                    border: '1px solid #17204b',
                    borderRadius: 40,
                    cornerShape: 'squircle',
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 700 }}>
                    Mark positioning
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      gap: 18,
                      marginTop: 17,
                      fontSize: 64,
                      lineHeight: 1,
                    }}
                  >
                    <span>x́</span>
                    <span>q̈</span>
                  </div>
                  <div
                    style={{
                      ...annotationStyle,
                      color: '#354414',
                      marginTop: 13,
                    }}
                  >
                    mark · mkmk
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: 286,
                    padding: '22px 24px',
                    background: '#9e7bff',
                    border: '1px solid #17204b',
                    borderRadius: 40,
                    cornerShape: 'squircle',
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 700 }}>
                    RTL script shaping
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      alignSelf: 'stretch',
                      marginTop: 13,
                      fontFamily: 'Noto Sans Arabic',
                      fontSize: 31,
                      lineHeight: 1.25,
                      textAlign: 'right',
                      direction: 'rtl',
                    }}
                  >
                    <span lang='ar'>السلام عليكم</span>
                    <span lang='ar'>لا إله إلا الله</span>
                  </div>
                  <div
                    style={{
                      ...annotationStyle,
                      color: '#40336c',
                      justifyContent: 'flex-end',
                      marginTop: 8,
                    }}
                  >
                    direction: rtl · Arabic joining
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flex: 1,
                  padding: '23px 25px',
                  background: '#3155ff',
                  color: '#fdfdf9',
                  border: '1px solid #17204b',
                  borderRadius: 40,
                  cornerShape: 'squircle',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: 284,
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 700 }}>
                    Proportional kana
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      marginTop: 16,
                      fontSize: 39,
                      lineHeight: 1,
                    }}
                  >
                    こんにちは
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      marginTop: 8,
                      fontSize: 39,
                      lineHeight: 1,
                      fontFeatureSettings: '"palt"',
                    }}
                  >
                    こんにちは
                  </div>
                  <div
                    style={{
                      ...annotationStyle,
                      color: '#d9e0ff',
                      marginTop: 11,
                    }}
                  >
                    {'font-feature-settings: "palt";'}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    paddingLeft: 28,
                    borderLeft: '1px solid rgba(253, 253, 249, 0.38)',
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 700 }}>
                    Fallback, without seams
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      marginTop: 17,
                      fontSize: 25,
                      lineHeight: 1.15,
                      letterSpacing: 1.5,
                    }}
                  >
                    Type 你好 Type
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      marginTop: 8,
                      fontSize: 25,
                      lineHeight: 1.15,
                      letterSpacing: 1.5,
                    }}
                  >
                    Hello 안녕 Hello
                  </div>
                  <div
                    style={{
                      ...annotationStyle,
                      color: '#d9e0ff',
                      marginTop: 12,
                    }}
                  >
                    spacing crosses font boundaries
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        {
          width: 1200,
          height: 630,
          fonts: [...latinCjkFonts, ...arabicFonts],
          pointScaleFactor: 2,
        }
      )

      expect(toImage(svg, 1200)).toMatchImageSnapshot()
    })
  })

  describe('Arabic Script Shaping', () => {
    it('should shape Arabic letters with proper ligatures (lam-alef)', async () => {
      // The word "لا" (lam-alef) should form a ligature
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 48,
          }}
        >
          <div style={{ color: 'black' }}>لا إله إلا الله</div>
        </div>,
        { width: 400, height: 150, fonts: arabicFonts, embedFont: true }
      )
      expect(toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should shape Arabic greeting with connected letters', async () => {
      // Arabic letters should connect properly (initial, medial, final forms)
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 48,
          }}
        >
          <div style={{ color: 'black' }}>السلام عليكم</div>
        </div>,
        { width: 400, height: 150, fonts: arabicFonts, embedFont: true }
      )
      expect(toImage(svg, 400)).toMatchImageSnapshot()
    })

    it('should handle Arabic text without explicit direction', async () => {
      // HarfBuzz should auto-detect RTL direction for Arabic script
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 48,
          }}
        >
          <div style={{ color: 'black' }}>مرحبا</div>
        </div>,
        { width: 400, height: 150, fonts: arabicFonts, embedFont: true }
      )
      expect(toImage(svg, 400)).toMatchImageSnapshot()
    })
  })

  describe('Hebrew Script Shaping', () => {
    it('should shape Hebrew text correctly', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 48,
          }}
        >
          <div style={{ color: 'black' }}>שלום עולם</div>
        </div>,
        { width: 400, height: 150, fonts: hebrewFonts, embedFont: true }
      )
      expect(toImage(svg, 400)).toMatchImageSnapshot()
    })
  })

  describe('Whitespace Handling', () => {
    it('should have proper spacing between Arabic words', async () => {
      // Spaces between Arabic words should use consistent spacing
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 48,
          }}
        >
          <div style={{ color: 'black' }}>السلام عليكم ورحمة الله</div>
        </div>,
        { width: 600, height: 150, fonts: arabicFonts, embedFont: true }
      )
      expect(toImage(svg, 600)).toMatchImageSnapshot()
    })

    it('should handle multiple spaces correctly', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 48,
          }}
        >
          <div style={{ color: 'black' }}>مرحبا بالعالم</div>
        </div>,
        { width: 400, height: 150, fonts: arabicFonts, embedFont: true }
      )
      expect(toImage(svg, 400)).toMatchImageSnapshot()
    })
  })

  describe('Mixed scripts', () => {
    it('should handle mixed Arabic and Latin text', async () => {
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 32,
          }}
        >
          <div style={{ color: 'black' }}>مرحبا Hello مع World السلام</div>
        </div>,
        { width: 500, height: 150, fonts: mixedFonts, embedFont: true }
      )
      expect(toImage(svg, 500)).toMatchImageSnapshot()
    })

    it('should shape Arabic correctly in LTR context', async () => {
      // Even in LTR container, Arabic letters should still connect properly
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 32,
          }}
        >
          <div style={{ color: 'black' }}>Hello مرحبا World</div>
        </div>,
        { width: 500, height: 150, fonts: mixedFonts, embedFont: true }
      )
      expect(toImage(svg, 500)).toMatchImageSnapshot()
    })

    it('should have correct spacing at script boundaries', async () => {
      // When transitioning between Arabic and Latin, spacing should be correct
      const svg = await satori(
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#fff',
            fontSize: 32,
          }}
        >
          <div style={{ color: 'black' }}>Hello مرحبا</div>
        </div>,
        { width: 300, height: 150, fonts: mixedFonts, embedFont: true }
      )
      expect(toImage(svg, 300)).toMatchImageSnapshot()
    })
  })
})
