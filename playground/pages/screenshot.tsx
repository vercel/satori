/**
 * Renders a web page with Satori, see `/api/screenshot`. Only available in
 * development.
 */

import Head from 'next/head'
import { useRouter } from 'next/router'
import { FormEvent, ReactNode, useEffect, useRef, useState } from 'react'

import styles from '../components/screenshot.module.css'

export function getServerSideProps() {
  return process.env.NODE_ENV === 'development'
    ? { props: {} }
    : { notFound: true }
}

interface Info {
  stylesheets: { loaded: number; failed: string[] }
  fonts: { loaded: string[]; skipped: string[] }
  styleErrors: string[]
  styleErrorCount: number
}

interface Result {
  /** An object URL of the SVG. */
  src: string
  api: string
  url: string
  width: number
  height: number
  timings: [name: string, duration: number][]
  info: Info
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

function parseTimings(header: string | null): Result['timings'] {
  return (header ?? '')
    .split(',')
    .map((entry) => {
      const [name, ...params] = entry.trim().split(';')
      const duration = params.find((param) => param.startsWith('dur='))
      return [name, Number(duration?.slice(4))] as [string, number]
    })
    .filter(([name, duration]) => name && Number.isFinite(duration))
}

export default function Screenshot() {
  const router = useRouter()
  const [url, setURL] = useState('')
  const [width, setWidth] = useState(1280)
  const [height, setHeight] = useState(800)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef(0)

  async function render(
    target: string,
    viewportWidth: number,
    viewportHeight: number
  ) {
    const id = ++request.current
    const params = new URLSearchParams({
      url: target,
      width: String(viewportWidth),
      height: String(viewportHeight),
    })
    const api = `/api/screenshot?${params}`
    setLoading(true)
    setError('')
    try {
      const response = await fetch(api)
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(
          body.error ?? `${response.status} ${response.statusText}`
        )
      }
      const svg = await response.blob()
      const info: Info = JSON.parse(
        decodeURIComponent(response.headers.get('X-Screenshot') ?? '%7B%7D')
      )
      if (id !== request.current) return
      setResult({
        src: URL.createObjectURL(svg),
        api,
        url: target,
        width: viewportWidth,
        height: viewportHeight,
        timings: parseTimings(response.headers.get('Server-Timing')),
        info,
      })
    } catch (caught) {
      if (id !== request.current) return
      setResult(null)
      setError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      if (id === request.current) setLoading(false)
    }
  }

  // Object URLs are kept until the next result.
  useEffect(() => {
    const src = result?.src
    return () => {
      if (src) URL.revokeObjectURL(src)
    }
  }, [result?.src])

  // Renders the page of the query, e.g. after a reload.
  useEffect(() => {
    if (!router.isReady) return
    const target = first(router.query.url)
    if (!target) return
    const queryWidth = Number(first(router.query.width)) || 1280
    const queryHeight = Number(first(router.query.height)) || 800
    setURL(target)
    setWidth(queryWidth)
    setHeight(queryHeight)
    render(target, queryWidth, queryHeight)
    // Only once the query is known.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady])

  function submit(event: FormEvent) {
    event.preventDefault()
    let target = url.trim()
    if (!/^https?:\/\//i.test(target)) target = `https://${target}`
    setURL(target)
    router.replace({ query: { url: target, width, height } }, undefined, {
      shallow: true,
    })
    render(target, width, height)
  }

  const info = result?.info
  return (
    <>
      <Head>
        <title>Satori Screenshot</title>
      </Head>
      <nav>
        <h1>
          <svg viewBox='0 0 75 65' fill='#000' height='12'>
            <title>Vercel</title>
            <path d='M37.59.25l36.95 64H.64l36.95-64z'></path>
          </svg>
          Satori Screenshot
          <span className={styles.badge}>development only</span>
        </h1>
        <ul>
          <li>
            <a href='/'>Playground</a>
          </li>
        </ul>
      </nav>
      <main className={styles.main}>
        <form className={styles.form} onSubmit={submit}>
          <input
            className={styles.url}
            type='text'
            inputMode='url'
            placeholder='https://nextjs.org'
            aria-label='URL'
            value={url}
            onChange={(event) => setURL(event.target.value)}
            required
            autoFocus
          />
          <label className={styles.size}>
            W
            <input
              type='number'
              min={100}
              max={4000}
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
            />
          </label>
          <label className={styles.size}>
            H
            <input
              type='number'
              min={100}
              max={8000}
              value={height}
              onChange={(event) => setHeight(Number(event.target.value))}
            />
          </label>
          <button type='submit' disabled={loading}>
            {loading ? 'Rendering…' : 'Render'}
          </button>
        </form>

        <section className={styles.panel}>
          <header className={styles.header}>
            <h2>SVG</h2>
            {result && (
              <span className={styles.links}>
                <a href={result.api} target='_blank' rel='noreferrer'>
                  Open SVG
                </a>
                <a href={result.url} target='_blank' rel='noreferrer'>
                  Open page
                </a>
              </span>
            )}
          </header>
          <div className={styles.frame} aria-busy={loading}>
            {error ? (
              <pre className={styles.error}>{error}</pre>
            ) : result ? (
              <img
                className={styles.image}
                src={result.src}
                width={result.width}
                height={result.height}
                alt={`Satori's rendering of ${result.url}`}
              />
            ) : (
              <p className={styles.empty}>
                {loading
                  ? 'Rendering…'
                  : 'Enter a URL to render it with Satori. Scripts don’t run, so the page is rendered as the server sends it.'}
              </p>
            )}
          </div>
          <footer className={styles.footer}>
            {result ? (
              <>
                <span>
                  {result.timings
                    .map(
                      ([name, duration]) => `${name} ${Math.round(duration)}ms`
                    )
                    .join(' · ')}
                </span>
                <span>
                  {info?.stylesheets.loaded ?? 0} stylesheets ·{' '}
                  {info?.fonts.loaded.length ?? 0} fonts ·{' '}
                  {info?.styleErrorCount ?? 0} style errors
                </span>
              </>
            ) : (
              <span>{loading ? 'Fetching the page…' : 'Ready'}</span>
            )}
          </footer>
        </section>

        {info && (
          <section className={styles.details}>
            <Details title='Fonts' items={info.fonts.loaded}>
              {info.fonts.skipped.length > 0 && (
                <p className={styles.note}>
                  Skipped, as Satori can’t read them:{' '}
                  {info.fonts.skipped.join(', ')}
                </p>
              )}
            </Details>
            <Details
              title='Stylesheets that failed to load'
              items={info.stylesheets.failed}
            />
            <Details
              title={`Style errors (${info.styleErrorCount})`}
              items={info.styleErrors}
            />
          </section>
        )}
      </main>
    </>
  )
}

function Details({
  title,
  items,
  children,
}: {
  title: string
  items: string[]
  children?: ReactNode
}) {
  if (!items.length && !children) return null
  return (
    <details>
      <summary>{title}</summary>
      {children}
      {items.length > 0 && (
        <ul>
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </details>
  )
}
