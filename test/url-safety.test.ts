import { it, describe, expect } from 'vitest'

import { isUnsafeServerFetchUrl } from '../src/handler/url-safety.js'

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
