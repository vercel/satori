import { it, describe, expect, beforeAll } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'path'

import { toImage } from './utils.js'
import satori from '../src/index.js'

describe('RTL (Right-to-Left) Languages', () => {
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

  it('Should render Arabic text with RTL direction', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            direction: 'rtl',
            color: 'black',
          }}
        >
          مرحبا بالعالم
        </div>
      </div>,
      { width: 400, height: 200, fonts: arabicFonts, embedFont: true }
    )
    expect(toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('Should render Hebrew text with RTL direction', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            direction: 'rtl',
            color: 'black',
          }}
        >
          שלום עולם
        </div>
      </div>,
      { width: 400, height: 200, fonts: hebrewFonts, embedFont: true }
    )
    expect(toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('Should handle mixed LTR and RTL text (BiDi)', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 24,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            direction: 'rtl',
            color: 'black',
          }}
        >
          Hello مرحبا World
        </div>
      </div>,
      { width: 400, height: 200, fonts: mixedFonts, embedFont: true }
    )
    expect(toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('Should render RTL with text-align: right', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            direction: 'rtl',
            textAlign: 'right',
            color: 'black',
            width: '300px',
          }}
        >
          مرحبا بالعالم
        </div>
      </div>,
      { width: 400, height: 200, fonts: arabicFonts, embedFont: true }
    )
    expect(toImage(svg, 400)).toMatchImageSnapshot()
  })

  it('Should render RTL with text-align: left', async () => {
    const svg = await satori(
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          fontSize: 32,
          fontWeight: 600,
        }}
      >
        <div
          style={{
            direction: 'rtl',
            textAlign: 'left',
            color: 'black',
            width: '300px',
          }}
        >
          مرحبا بالعالم
        </div>
      </div>,
      { width: 400, height: 200, fonts: arabicFonts, embedFont: true }
    )
    expect(toImage(svg, 400)).toMatchImageSnapshot()
  })
})
