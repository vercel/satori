import { it, describe, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'path'

import { toImage } from './utils.js'
import satori from '../src/index.js'

describe('HarfBuzz Shaping', () => {
  let arabicFonts
  let hebrewFonts
  let mixedFonts

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

    const arabicFontData = await readFile(arabicFontPath)
    const hebrewFontData = await readFile(hebrewFontPath)
    const latinFontData = await readFile(latinFontPath)

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
          <div style={{ direction: 'rtl', color: 'black' }}>
            لا إله إلا الله
          </div>
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
          <div style={{ direction: 'rtl', color: 'black' }}>السلام عليكم</div>
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
          <div style={{ direction: 'rtl', color: 'black' }}>שלום עולם</div>
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
          <div style={{ direction: 'rtl', color: 'black' }}>
            السلام عليكم ورحمة الله
          </div>
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
          <div style={{ direction: 'rtl', color: 'black' }}>مرحبا بالعالم</div>
        </div>,
        { width: 400, height: 150, fonts: arabicFonts, embedFont: true }
      )
      expect(toImage(svg, 400)).toMatchImageSnapshot()
    })
  })

  describe('Mixed Scripts (BiDi)', () => {
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
          <div style={{ direction: 'rtl', color: 'black' }}>
            مرحبا Hello مع World السلام
          </div>
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
          <div style={{ direction: 'rtl', color: 'black' }}>Hello مرحبا</div>
        </div>,
        { width: 300, height: 150, fonts: mixedFonts, embedFont: true }
      )
      expect(toImage(svg, 300)).toMatchImageSnapshot()
    })
  })
})
