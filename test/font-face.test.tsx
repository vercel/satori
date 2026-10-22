import { it, describe, expect, beforeAll, afterEach } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { toImage } from './utils.js'
import satori from '../src/index.js'

const asset = (name: string) =>
  readFile(join(process.cwd(), 'test', 'assets', name))

describe('@font-face', () => {
  let roboto: Buffer
  let habbo: Buffer
  let hebrew: Buffer
  beforeAll(async () => {
    ;[roboto, habbo, hebrew] = await Promise.all([
      asset('Roboto-Regular.ttf'),
      asset('Habbo.ttf'),
      asset('NotoSansHebrew-Regular.ttf'),
    ])
  })

  const dataURL = (data: Buffer) =>
    `data:font/ttf;base64,${data.toString('base64')}`
  const fonts = () => [
    {
      name: 'Roboto',
      data: roboto,
      weight: 400 as const,
      style: 'normal' as const,
    },
  ]

  /** Serves fonts at `https://example.com/<name>.ttf`, and counts requests. */
  let requests: string[] = []
  const serve = (files: Record<string, Buffer>) => {
    requests = []
    ;(globalThis as any).fetch = async (url: string) => {
      requests.push(String(url))
      const name = /\/(\w+)\.ttf$/.exec(String(url))?.[1]
      const data = name && files[name]
      return {
        ok: !!data,
        status: data ? 200 : 404,
        headers: { get: () => 'font/ttf' },
        arrayBuffer: async () =>
          data
            ? data.buffer.slice(data.byteOffset, data.byteOffset + data.length)
            : new ArrayBuffer(0),
      }
    }
  }
  afterEach(() => {
    delete (globalThis as any).fetch
  })

  const text = (family: string, content = 'Hello') => (
    <div style={{ display: 'flex', fontSize: 20, fontFamily: family }}>
      {content}
    </div>
  )

  it('should use the fonts of @font-face rules', async () => {
    const svg = await satori(
      <div style={{ display: 'flex' }}>
        <style>{`@font-face { font-family: "Pixel"; src: url(${dataURL(
          habbo
        )}) format("truetype") }`}</style>
        {text('Pixel')}
      </div>,
      { width: 100, height: 30, fonts: fonts() }
    )
    // Like the same font in the `fonts` option.
    const expected = await satori(
      <div style={{ display: 'flex' }}>
        <style>{'.unused {}'}</style>
        {text('Pixel')}
      </div>,
      {
        width: 100,
        height: 30,
        fonts: [...fonts(), { name: 'Pixel', data: habbo, weight: 400 }],
      }
    )
    expect(svg).toBe(expected)
    expect(await toImage(svg, 100)).toMatchImageSnapshot()
  })

  it('should only load the fonts that text uses', async () => {
    serve({ pixel: habbo, unused: habbo, hebrew })
    await satori(
      <div style={{ display: 'flex' }}>
        <style>
          {`
            @font-face { font-family: Pixel; src: local(Pixel), url(https://example.com/pixel.ttf) }
            @font-face { font-family: Unused; src: url(https://example.com/unused.ttf) }
            @font-face { font-family: Pixel; src: url(https://example.com/hebrew.ttf); unicode-range: U+0590-05FF }
            @media (max-width: 10px) {
              @font-face { font-family: Pixel; src: url(https://example.com/narrow.ttf) }
            }
          `}
        </style>
        {text('Pixel, sans-serif')}
      </div>,
      { width: 100, height: 30, fonts: fonts() }
    )
    expect(requests).toEqual(['https://example.com/pixel.ttf'])
  })

  it('should prefer the fonts of the fonts option', async () => {
    serve({ pixel: habbo })
    const page = (css: string) => (
      <div style={{ display: 'flex' }}>
        <style>{css}</style>
        {text('Roboto')}
      </div>
    )
    const options = { width: 100, height: 30, fonts: fonts() }
    expect(
      await satori(
        page(
          '@font-face { font-family: Roboto; src: url(https://example.com/pixel.ttf) }'
        ),
        options
      )
    ).toBe(await satori(page('.unused {}'), options))
    expect(requests).toEqual([])
  })

  it('should skip fonts that fail to load, like browsers', async () => {
    serve({ pixel: habbo, broken: Buffer.from('not a font') })
    const page = (css: string) => (
      <div style={{ display: 'flex' }}>
        <style>{css}</style>
        {text('Pixel')}
      </div>
    )
    const options = { width: 100, height: 30, fonts: fonts() }
    // The next source is used.
    expect(
      await satori(
        page(
          '@font-face { font-family: Pixel; src: url(https://example.com/missing.ttf), url(https://example.com/broken.ttf), url(https://example.com/pixel.ttf) }'
        ),
        options
      )
    ).toBe(
      await satori(page('.unused {}'), {
        ...options,
        fonts: [...fonts(), { name: 'Pixel', data: habbo, weight: 400 }],
      })
    )
    // Without one, the text falls back.
    expect(
      await satori(
        page(
          '@font-face { font-family: Pixel; src: url(https://example.com/broken.ttf) }'
        ),
        options
      )
    ).toBe(await satori(page('.unused {}'), options))
  })

  it('should only use the fonts in their render', async () => {
    const page = (css: string) => (
      <div style={{ display: 'flex' }}>
        <style>{css}</style>
        {text('Pixel')}
      </div>
    )
    const options = { width: 100, height: 30, fonts: fonts() }
    const before = await satori(page('.unused {}'), options)
    await satori(
      page(`@font-face { font-family: Pixel; src: url(${dataURL(habbo)}) }`),
      options
    )
    expect(await satori(page('.unused {}'), options)).toBe(before)
  })

  it('should use the subsets of a family for their scripts', async () => {
    const content = 'Hi שלום'
    const svg = await satori(
      <div style={{ display: 'flex' }}>
        <style>
          {`
            @font-face { font-family: Mixed; src: url(${dataURL(
              roboto
            )}); unicode-range: U+0000-00FF }
            @font-face { font-family: Mixed; src: url(${dataURL(
              hebrew
            )}); unicode-range: U+0590-05FF }
          `}
        </style>
        {text('Mixed', content)}
      </div>,
      { width: 120, height: 30, fonts: [{ name: 'Pixel', data: habbo }] }
    )
    const expected = await satori(
      <div style={{ display: 'flex' }}>
        <style>{'.unused {}'}</style>
        {text('Mixed', content)}
      </div>,
      {
        width: 120,
        height: 30,
        fonts: [
          { name: 'Pixel', data: habbo },
          { name: 'Mixed', data: roboto, weight: 400 },
          { name: 'Mixed', data: hebrew, weight: 400 },
        ],
      }
    )
    expect(svg).toBe(expected)
    expect(await toImage(svg, 120)).toMatchImageSnapshot()
  })
})
