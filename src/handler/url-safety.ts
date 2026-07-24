/**
 * SSRF guard for server-side image fetches.
 *
 * Satori resolves `<img src>`, SVG `<image href>` and CSS `background-image`
 * URLs by calling `fetch()` on the server. Without a guard, an attacker who
 * controls that URL can point it at internal addresses (`127.0.0.1`,
 * `169.254.169.254` cloud metadata, RFC-1918 ranges) and — because Satori
 * base64-inlines `image/svg+xml` responses into its output — read the body
 * back in-band.
 *
 * Layers:
 *  1. Literal-host classification (all runtimes) — blocks private IPs,
 *     localhost, `.local` / `.internal`, and embedded-IPv4 IPv6 forms.
 *  2. Per-hop redirect validation — `fetch` is called with `redirect:
 *     'manual'` so a public URL cannot bounce to an internal Location.
 *  3. DNS resolution when `node:dns` is available — rejects hostnames that
 *     resolve to a private address. Residual DNS-rebinding (IP flips between
 *     lookup and connect) still needs a connect-time-pinning fetcher
 *     (e.g. `@vercel/safe-fetch`) or egress controls.
 *
 * WHATWG `URL` normalizes obfuscated IPv4 (`http://0x7f.1`, `http://2130706433`)
 * to dotted-decimal for us.
 */

const IPV4_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/
const MAX_REDIRECTS = 10
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308])

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
 * Expands an IPv6 literal into 8 16-bit groups, handling `::` compression and
 * an optional dotted-decimal IPv4 tail. Returns null if unparseable.
 */
function parseIpv6(ip: string): number[] | null {
  let address = ip
  const zone = address.indexOf('%')
  if (zone !== -1) address = address.slice(0, zone)

  const halves = address.split('::')
  if (halves.length > 2) return null

  const toGroups = (segment: string): number[] | null => {
    if (segment === '') return []
    const groups: number[] = []
    const parts = segment.split(':')
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (part.includes('.')) {
        if (i !== parts.length - 1 || !IPV4_RE.test(part)) return null
        const [a, b, c, d] = part.split('.').map((p) => Number.parseInt(p, 10))
        if (
          [a, b, c, d].some((n) => !Number.isInteger(n) || n < 0 || n > 255)
        ) {
          return null
        }
        groups.push((a << 8) | b, (c << 8) | d)
        continue
      }
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null
      groups.push(Number.parseInt(part, 16))
    }
    return groups
  }

  const head = toGroups(halves[0])
  if (head === null) return null

  if (halves.length === 2) {
    const tail = toGroups(halves[1])
    if (tail === null) return null
    const fill = 8 - head.length - tail.length
    if (fill < 0) return null
    return [...head, ...new Array(fill).fill(0), ...tail]
  }

  return head.length === 8 ? head : null
}

/**
 * Decodes the IPv4 destination embedded in an IPv6 literal, or null if none.
 * Covers every form whose low 32 bits route to an IPv4 address:
 *   `::ffff:a.b.c.d` / `::ffff:HI:LO`           IPv4-mapped
 *   `::ffff:0:a.b.c.d` / `::ffff:0:HI:LO`       IPv4-translated (SIIT)
 *   `64:ff9b::a.b.c.d` / `64:ff9b::HI:LO`       NAT64 well-known prefix
 *   `64:ff9b:1::…`                              NAT64 local-use prefix
 *   `::a.b.c.d` / `::HI:LO`                     IPv4-compatible (deprecated)
 */
function embeddedIpv4(groups: number[]): string | null {
  const topZero = (n: number) => groups.slice(0, n).every((g) => g === 0)
  const embeds =
    topZero(6) || // ::/96 IPv4-compatible
    (topZero(5) && groups[5] === 0xffff) || // ::ffff:0:0/96 mapped
    (topZero(4) && groups[4] === 0xffff && groups[5] === 0) || // translated
    (groups[0] === 0x64 &&
      groups[1] === 0xff9b &&
      groups[2] === 0 &&
      groups[3] === 0 &&
      groups[4] === 0 &&
      groups[5] === 0) || // 64:ff9b::/96
    (groups[0] === 0x64 && groups[1] === 0xff9b && groups[2] === 1) // 64:ff9b:1::/48

  if (!embeds) return null
  const a = (groups[6] >> 8) & 0xff
  const b = groups[6] & 0xff
  const c = (groups[7] >> 8) & 0xff
  const d = groups[7] & 0xff
  return `${a}.${b}.${c}.${d}`
}

/**
 * IPv6 ranges unsafe for server-side fetches. Embedded-IPv4 forms (mapped,
 * translated, NAT64, compatible) are decoded and classified as IPv4. Host is
 * already lowercased with brackets stripped.
 */
function isUnsafeIpv6(host: string): boolean {
  const groups = parseIpv6(host)
  if (groups === null) return true // unparseable — fail closed

  const v4 = embeddedIpv4(groups)
  if (v4) return isUnsafeIpv4(v4)

  if (groups.every((g) => g === 0)) return true // ::
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true // ::1
  if ((groups[0] & 0xfe00) === 0xfc00) return true // fc00::/7 ULA
  if ((groups[0] & 0xffc0) === 0xfe80) return true // fe80::/10 link-local
  if ((groups[0] & 0xffc0) === 0xfec0) return true // fec0::/10 site-local
  if ((groups[0] & 0xff00) === 0xff00) return true // ff00::/8 multicast
  if (groups[0] === 0x2001 && groups[1] === 0xdb8) return true // 2001:db8::/32
  return false
}

/** Classify a raw IPv4/IPv6 address string (e.g. from `dns.lookup`). */
export function isUnsafeIpAddress(address: string): boolean {
  const host = address.toLowerCase().replace(/^\[|\]$/g, '')
  if (IPV4_RE.test(host)) return isUnsafeIpv4(host)
  if (host.includes(':')) return isUnsafeIpv6(host)
  return true // not an IP — fail closed
}

function normalizeHostname(rawUrl: string): {
  url: URL
  host: string
} | null {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  // Strip trailing dots so FQDNs like `localhost.` (WHATWG hostname stays
  // `localhost.`) cannot bypass the hostname blocklist.
  let host = url.hostname.toLowerCase().replace(/\.+$/, '')
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1)
  if (!host) return null
  return { url, host }
}

/**
 * Returns `true` if Satori must refuse to `fetch()` this URL server-side based
 * on the literal hostname / IP. Does not resolve DNS.
 */
export function isUnsafeServerFetchUrl(rawUrl: string): boolean {
  const parsed = normalizeHostname(rawUrl)
  if (!parsed) return true
  const { host } = parsed

  if (host === 'localhost' || host.endsWith('.localhost')) return true
  if (host === 'local' || host.endsWith('.local')) return true
  // Cloud / corp DNS special-use: GCP metadata is `metadata.google.internal`.
  if (host === 'internal' || host.endsWith('.internal')) return true

  if (IPV4_RE.test(host)) return isUnsafeIpv4(host)
  if (host.includes(':')) return isUnsafeIpv6(host)

  return false
}

function ssrfError(rawUrl: string): Error {
  return new Error(
    `Image source resolves to a blocked address (SSRF protection): ${rawUrl}`
  )
}

/** Throws if `rawUrl` is unsafe for a server-side image fetch (literal host). */
export function assertSafeServerFetchUrl(rawUrl: string): void {
  if (isUnsafeServerFetchUrl(rawUrl)) throw ssrfError(rawUrl)
}

type DnsLookup = (
  hostname: string,
  options: { all: true }
) => Promise<Array<{ address: string; family: number }>>

type SafeFetchOptions = {
  /** Override DNS lookup (tests). `null` skips DNS. Default: node:dns when available. */
  lookup?: DnsLookup | null
  /** Override fetch (tests). Default: globalThis.fetch. */
  fetch?: typeof globalThis.fetch
}

let dnsLookup: DnsLookup | null | undefined

/** Lazy-load `node:dns/promises` when available; null in browser / edge. */
async function getDnsLookup(): Promise<DnsLookup | null> {
  if (dnsLookup !== undefined) return dnsLookup
  if (typeof window !== 'undefined') {
    dnsLookup = null
    return null
  }
  try {
    const dns = await import('node:dns/promises')
    dnsLookup = (hostname, options) => dns.lookup(hostname, options)
    return dnsLookup
  } catch {
    dnsLookup = null
    return null
  }
}

/**
 * Literal-host check, then (on Node) DNS-resolve and reject private answers.
 * IP literals skip DNS. When `node:dns` is unavailable, falls back to literal
 * checks only.
 */
export async function assertSafeServerFetchTarget(
  rawUrl: string,
  options?: SafeFetchOptions
): Promise<void> {
  assertSafeServerFetchUrl(rawUrl)

  const parsed = normalizeHostname(rawUrl)
  if (!parsed) throw ssrfError(rawUrl)
  const { host } = parsed

  // Already classified as a literal address above.
  if (IPV4_RE.test(host) || host.includes(':')) return

  const lookup =
    options && 'lookup' in options ? options.lookup : await getDnsLookup()
  if (!lookup) return

  let records: Array<{ address: string; family: number }>
  try {
    records = await lookup(host, { all: true })
  } catch {
    // Resolver failure — do not fetch an unverified host.
    throw new Error(`Can't resolve image host: ${rawUrl}`)
  }

  if (records.length === 0) {
    throw new Error(`Can't resolve image host: ${rawUrl}`)
  }

  for (const { address } of records) {
    if (isUnsafeIpAddress(address)) throw ssrfError(rawUrl)
  }
}

/**
 * Drain a response body so the underlying socket is released (important for
 * redirect hops we are about to abandon or reject).
 */
async function cancelBody(res: Response): Promise<void> {
  try {
    if (res.body && typeof res.body.cancel === 'function') {
      await res.body.cancel()
    } else if (typeof res.arrayBuffer === 'function') {
      await res.arrayBuffer()
    }
  } catch {
    // ignore — best-effort drain
  }
}

/**
 * Server-side image `fetch` with SSRF controls: validates every hop (literal +
 * DNS) and never follows redirects blindly.
 */
export async function safeServerFetch(
  rawUrl: string,
  options?: SafeFetchOptions
): Promise<Response> {
  const doFetch = options?.fetch ?? globalThis.fetch
  let currentUrl = rawUrl

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    await assertSafeServerFetchTarget(currentUrl, options)

    const response = await doFetch(currentUrl, { redirect: 'manual' })

    // Spec-compliant fetch yields an opaque-redirect in browsers; we never
    // call this helper in the browser (see image.ts), so treat it as unsafe.
    if (response.type === 'opaqueredirect') {
      await cancelBody(response)
      throw ssrfError(currentUrl)
    }

    const location = response.headers.get('location')
    if (REDIRECT_STATUS.has(response.status) && location) {
      await cancelBody(response)
      currentUrl = new URL(location, currentUrl).href
      continue
    }

    return response
  }

  throw new Error(
    `Image source redirected too many times (SSRF protection): ${rawUrl}`
  )
}
