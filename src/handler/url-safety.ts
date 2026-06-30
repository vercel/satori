/**
 * SSRF guard for server-side image fetches.
 *
 * Satori resolves `<img src>`, SVG `<image href>` and CSS `background-image`
 * URLs by calling `fetch()` on the server. Without a guard, an attacker who
 * controls that URL can point it at internal addresses (`127.0.0.1`,
 * `169.254.169.254` cloud metadata, RFC-1918 ranges) and — because Satori
 * base64-inlines `image/svg+xml` responses into its output — read the body
 * back in-band. This blocks the unsafe address ranges before the fetch.
 *
 * This is intentionally dependency-free and runtime-agnostic (browser, edge,
 * Node) — it cannot use `node:dns`/`node:net`, so it only classifies the
 * literal host. WHATWG `URL` normalizes obfuscated IPv4 forms
 * (`http://0x7f.1`, `http://2130706433`) to dotted-decimal for us, closing the
 * classic blocklist bypasses.
 *
 * ponytail: literal-host classification only; a hostname that *resolves* to a
 * private IP (DNS rebinding) is not covered here. Hosts needing full coverage
 * should run Satori behind an SSRF-safe fetcher (e.g. `@vercel/safe-fetch`,
 * which DNS-resolves and pins the connect-time IP).
 */

const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/

/**
 * IPv4 ranges unsafe for server-side outbound fetches: `0.0.0.0/8`,
 * `10/8`, `100.64/10` (CGNAT), `127/8` (loopback), `169.254/16` (link-local,
 * incl. cloud metadata), `172.16/12`, `192.0.0/24` (IETF), `192.168/16`,
 * `198.18/15` (benchmark), and `224/4`–`255/4` (multicast/reserved/broadcast).
 */
function isUnsafeIpv4(v4: string): boolean {
  const octets = v4.split('.').map((p) => Number.parseInt(p, 10))
  if (
    octets.length !== 4 ||
    octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
  ) {
    return true // malformed — fail closed
  }
  const [a, b, c] = octets as [number, number, number, number]
  if (a === 0) return true
  if (a === 10) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 0 && c === 0) return true
  if (a === 192 && b === 168) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a >= 224) return true
  return false
}

/**
 * Decodes the IPv4 destination embedded in an IPv6 literal, or null if none.
 * Covers every form whose low 32 bits route to an IPv4 address:
 *   `::ffff:a.b.c.d` / `::ffff:HI:LO`   IPv4-mapped
 *   `64:ff9b::a.b.c.d` / `64:ff9b::HI:LO` NAT64 well-known prefix (RFC 6052)
 *   `::a.b.c.d` / `::HI:LO`             IPv4-compatible (deprecated)
 * WHATWG `URL` normalizes all of these to the hex `HI:LO` form; the dotted
 * branch is kept for non-normalized inputs. Scoped to these prefixes so a
 * public IPv6 whose low bits happen to look private isn't mis-decoded.
 */
function embeddedIpv4(host: string): string | null {
  const dotted = host.match(
    /^(?:::ffff:|64:ff9b::|::)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/
  )
  if (dotted) return dotted[1]

  const hex = host.match(
    /^(?:::ffff:|64:ff9b::|::)([0-9a-f]{1,4}):([0-9a-f]{1,4})$/
  )
  if (hex) {
    const hi = Number.parseInt(hex[1], 16)
    const lo = Number.parseInt(hex[2], 16)
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
  }
  return null
}

/**
 * IPv6 ranges unsafe for server-side fetches. Embedded-IPv4 forms (mapped,
 * NAT64, compatible) are decoded and classified as IPv4. Host is already
 * lowercased with brackets stripped.
 */
function isUnsafeIpv6(host: string): boolean {
  const v4 = embeddedIpv4(host)
  if (v4) return isUnsafeIpv4(v4)

  if (host === '::' || host === '::1') return true // unspecified, loopback
  if (host.startsWith('fc') || host.startsWith('fd')) return true // fc00::/7 ULA
  if (/^fe[89ab]/.test(host)) return true // fe80::/10 link-local
  if (/^fe[c-f]/.test(host)) return true // fec0::/10 site-local
  if (host.startsWith('ff')) return true // ff00::/8 multicast
  if (/^2001:0?db8(?::|$)/.test(host)) return true // 2001:db8::/32 docs
  return false
}

/**
 * Returns `true` if Satori must refuse to `fetch()` this URL server-side.
 * Fails closed on anything it can't parse or classify as clearly public.
 */
export function isUnsafeServerFetchUrl(rawUrl: string): boolean {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return true
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true

  let host = url.hostname.toLowerCase()
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1)

  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host.endsWith('.local')) return true

  if (IPV4_RE.test(host)) return isUnsafeIpv4(host)
  if (host.includes(':')) return isUnsafeIpv6(host)

  // Regular hostname — DNS resolution isn't available in all runtimes, so we
  // can't classify what it resolves to. Allowed (see ponytail note above).
  return false
}

/** Throws if `rawUrl` is unsafe for a server-side image fetch. */
export function assertSafeServerFetchUrl(rawUrl: string): void {
  if (isUnsafeServerFetchUrl(rawUrl)) {
    throw new Error(
      `Image source resolves to a blocked address (SSRF protection): ${rawUrl}`
    )
  }
}
