/**
 * Renders a web page with Satori as an SVG, like a screenshot of its
 * viewport, e.g. `/api/screenshot?url=https://nextjs.org&width=1280`.
 *
 * Only available in development: the page is fetched from the server, with
 * its stylesheets and fonts. The `Server-Timing` header reports the time of
 * each step, and `X-Screenshot` what was loaded, as URI-encoded JSON.
 */

import type { NextApiRequest, NextApiResponse } from 'next'
import { screenshot } from '../../utils/screenshot'

const MAX_STYLE_ERRORS = 50

export const config = {
  // The SVGs of long pages are often larger than 4MB.
  api: { responseLimit: false },
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

function size(value: string | undefined, fallback: number, max: number) {
  const number = Math.round(Number(value))
  return Number.isFinite(number) && number > 0
    ? Math.min(number, max)
    : fallback
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (process.env.NODE_ENV !== 'development') {
    res.status(404).end()
    return
  }

  let url: URL
  try {
    url = new URL(first(req.query.url) ?? '')
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error()
  } catch {
    res.status(400).json({ error: 'Pass an http(s) URL as `url`.' })
    return
  }
  const width = size(first(req.query.width), 1280, 4000)
  const height = size(first(req.query.height), 800, 8000)

  try {
    const result = await screenshot(url, { width, height })
    res.setHeader('Content-Type', 'image/svg+xml')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader(
      'Server-Timing',
      Object.entries(result.timings)
        .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
        .join(', ')
    )
    res.setHeader(
      'X-Screenshot',
      encodeURIComponent(
        JSON.stringify({
          stylesheets: result.stylesheets,
          fonts: result.fonts,
          styleErrors: result.styleErrors.slice(0, MAX_STYLE_ERRORS),
          styleErrorCount: result.styleErrors.length,
        })
      )
    )
    res.send(result.svg)
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
