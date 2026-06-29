import { it, describe, expect, beforeEach } from 'vitest'

import { initFonts, toImage } from './utils.js'
import satori from '../src/index.js'

// 1x1 transparent PNG.
const PNG_1x1 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC'

function pngResponse(): Response {
  const bytes = Uint8Array.from(atob(PNG_1x1), (c) => c.charCodeAt(0))
  return new Response(bytes, { headers: { 'content-type': 'image/png' } })
}

let fonts
initFonts((f) => (fonts = f))

describe('options.fetcher', () => {
  beforeEach(() => {
    // Make the global fetch explode so the test fails if it's used.
    ;(globalThis as any).fetch = () => {
      throw new Error('global fetch must not be used when fetcher is injected')
    }
  })

  function imgTree(src: string) {
    return {
      type: 'div',
      props: {
        style: { display: 'flex', width: 10, height: 10 },
        children: { type: 'img', props: { src, width: 10, height: 10 } },
      },
    } as any
  }

  it('routes image loads through the injected fetcher', async () => {
    const calls: string[] = []
    const fetcher = (async (url: any) => {
      calls.push(String(url))
      return pngResponse()
    }) as typeof fetch

    await satori(imgTree('https://example.com/a.png'), {
      width: 10,
      height: 10,
      fonts,
      fetcher,
    })

    expect(calls).toEqual(['https://example.com/a.png'])
  })

  it('blocks SSRF URLs before reaching the injected fetcher', async () => {
    let called = false
    const fetcher = (async () => {
      called = true
      return pngResponse()
    }) as typeof fetch

    // Fail closed: a blocked address throws (like the absolute-URL check),
    // and the injected fetcher is never invoked.
    await expect(
      satori(imgTree('http://169.254.169.254/latest/meta-data/'), {
        width: 10,
        height: 10,
        fonts,
        fetcher,
      })
    ).rejects.toThrow(/SSRF/)

    expect(called).toBe(false)
  })
})
