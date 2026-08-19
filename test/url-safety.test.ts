import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http'
import { it, describe, expect, afterEach } from 'vitest'

import {
  isUnsafeServerFetchUrl,
  isUnsafeIpAddress,
  assertSafeServerFetchTarget,
  safeServerFetch,
} from '../src/handler/url-safety.js'

describe('isUnsafeServerFetchUrl', () => {
  it('blocks the reported SSRF vectors', () => {
    for (const url of [
      'http://169.254.169.254/latest/meta-data/', // AWS/GCP metadata
      'http://127.0.0.1:9001/2018-06-01/runtime/invocation/next', // Lambda runtime API
      'http://localhost/api/env-dump',
      'http://10.0.0.5/',
      'http://172.16.3.4/',
      'http://192.168.1.1/',
      'http://[::1]/',
      'http://[fd00::1]/',
      'http://[fe80::1]/',
      'http://[::ffff:169.254.169.254]/', // IPv4-mapped IPv6
      'http://[64:ff9b::169.254.169.254]/', // NAT64 well-known prefix
      'http://[::127.0.0.1]/', // IPv4-compatible IPv6 (deprecated)
    ]) {
      expect(isUnsafeServerFetchUrl(url), url).toBe(true)
    }
  })

  it('blocks trailing-dot hostnames (FQDN form of localhost / .local)', () => {
    // WHATWG URL keeps the trailing root dot on hostnames (`localhost.`),
    // which previously skipped `host === 'localhost'`.
    for (const url of [
      'http://localhost./',
      'http://localhost.',
      'http://evil.localhost./img.png',
      'http://printer.local./',
      'http://metadata.google.internal./',
    ]) {
      expect(isUnsafeServerFetchUrl(url), url).toBe(true)
    }
  })

  it('blocks .internal hostnames (e.g. GCP metadata)', () => {
    expect(isUnsafeServerFetchUrl('http://metadata.google.internal/')).toBe(
      true
    )
    expect(isUnsafeServerFetchUrl('http://foo.internal/')).toBe(true)
  })

  it('blocks IPv4-translated and NAT64 local-use IPv6 forms', () => {
    // WHATWG leaves these uncompressed; the old prefix regex missed them.
    for (const url of [
      'http://[::ffff:0:127.0.0.1]/', // IPv4-translated (SIIT)
      'http://[::ffff:0:7f00:1]/',
      'http://[64:ff9b:1::169.254.169.254]/', // NAT64 local-use
      'http://[64:ff9b:1::a9fe:a9fe]/',
    ]) {
      expect(isUnsafeServerFetchUrl(url), url).toBe(true)
    }
  })

  it('blocks obfuscated IPv4 forms (WHATWG URL normalization)', () => {
    expect(isUnsafeServerFetchUrl('http://2130706433/')).toBe(true) // 127.0.0.1
    expect(isUnsafeServerFetchUrl('http://0x7f000001/')).toBe(true) // 127.0.0.1
    expect(isUnsafeServerFetchUrl('http://127.1/')).toBe(true) // 127.0.0.1
  })

  it('blocks non-http(s) protocols and unparseable input', () => {
    expect(isUnsafeServerFetchUrl('file:///etc/passwd')).toBe(true)
    expect(isUnsafeServerFetchUrl('ftp://example.com/')).toBe(true)
    expect(isUnsafeServerFetchUrl('not a url')).toBe(true)
  })

  it('allows public image URLs', () => {
    for (const url of [
      'https://example.com/og.png',
      'https://images.example.com/a/b/c.svg',
      'http://8.8.8.8/img.png',
      'https://[2606:4700:4700::1111]/img.png', // public IPv6
    ]) {
      expect(isUnsafeServerFetchUrl(url), url).toBe(false)
    }
  })
})

describe('isUnsafeIpAddress', () => {
  it('classifies DNS answer addresses', () => {
    expect(isUnsafeIpAddress('127.0.0.1')).toBe(true)
    expect(isUnsafeIpAddress('169.254.169.254')).toBe(true)
    expect(isUnsafeIpAddress('8.8.8.8')).toBe(false)
    expect(isUnsafeIpAddress('::1')).toBe(true)
    expect(isUnsafeIpAddress('2606:4700:4700::1111')).toBe(false)
  })
})

describe('assertSafeServerFetchTarget (DNS)', () => {
  it('rejects hostnames whose DNS answers are private', async () => {
    await expect(
      assertSafeServerFetchTarget('http://evil.example/', {
        lookup: async () => [{ address: '127.0.0.1', family: 4 }],
      })
    ).rejects.toThrow(/SSRF protection/)

    await expect(
      assertSafeServerFetchTarget('http://meta.example/', {
        lookup: async () => [{ address: '169.254.169.254', family: 4 }],
      })
    ).rejects.toThrow(/SSRF protection/)
  })

  it('allows hostnames whose DNS answers are public', async () => {
    await expect(
      assertSafeServerFetchTarget('http://cdn.example/img.png', {
        lookup: async () => [{ address: '8.8.8.8', family: 4 }],
      })
    ).resolves.toBeUndefined()
  })

  it('fails closed when DNS returns no records', async () => {
    await expect(
      assertSafeServerFetchTarget('http://empty.example/', {
        lookup: async () => [],
      })
    ).rejects.toThrow(/Can't resolve image host/)
  })
})

describe('safeServerFetch (redirects)', () => {
  let server: Server | undefined
  let base: string

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((err) => (err ? reject(err) : resolve()))
      )
      server = undefined
    }
  })

  async function listen(
    handler: (req: IncomingMessage, res: ServerResponse) => void
  ): Promise<string> {
    server = createServer(handler)
    await new Promise<void>((resolve) =>
      server!.listen(0, '127.0.0.1', resolve)
    )
    const addr = server.address()
    if (!addr || typeof addr === 'string') throw new Error('no address')
    base = `http://127.0.0.1:${addr.port}`
    return base
  }

  it('blocks a redirect to a private address', async () => {
    // Loopback open-redirector + stubbed DNS/fetch so hop 1 looks public
    // while Location points at a blocked address.
    const origin = await listen((req, res) => {
      if (req.url === '/open') {
        res.writeHead(302, {
          Location: 'http://169.254.169.254/latest/meta-data/',
        })
        res.end()
        return
      }
      res.writeHead(200, { 'content-type': 'image/png' })
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    })

    const publicUrl = 'http://images.example/open'
    await expect(
      safeServerFetch(publicUrl, {
        lookup: async () => [{ address: '8.8.8.8', family: 4 }],
        fetch: async (input) => {
          const u = typeof input === 'string' ? input : String(input)
          if (u === publicUrl || u.endsWith('/open')) {
            return fetch(`${origin}/open`, { redirect: 'manual' })
          }
          return fetch(input as string, { redirect: 'manual' })
        },
      })
    ).rejects.toThrow(/SSRF protection/)
  })

  it('follows a same-host redirect to a safe final URL', async () => {
    const origin = await listen((req, res) => {
      if (req.url === '/from') {
        res.writeHead(302, { Location: '/to' })
        res.end()
        return
      }
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.end('ok')
    })

    const start = 'http://cdn.example/from'
    const res = await safeServerFetch(start, {
      lookup: async () => [{ address: '8.8.8.8', family: 4 }],
      fetch: async (input) => {
        const u = typeof input === 'string' ? input : String(input)
        const path = new URL(u).pathname
        return fetch(`${origin}${path}`, { redirect: 'manual' })
      },
    })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
