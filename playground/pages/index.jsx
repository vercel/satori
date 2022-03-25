import satori from 'satori'
import { LiveProvider, LiveEditor, withLive } from 'react-live'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import Head from 'next/head'
import packageJson from 'satori/package.json'
import * as resvg from '@resvg/resvg-wasm'

import getTwemojiMap, { loadEmoji } from '../utils/twemoji'

import cards from '../cards/data'

// @TODO: Support font style and weights, and make this option extensible rather
// than built-in.
// @TODO: Cover most languages with Noto Sans.
// @TODO: Fix CJK missing punctuations, maybe inline guessLanguage?
const languageFontMap = {
  zh: 'Noto+Sans+SC',
  ja: 'Noto+Sans+JP',
  ko: 'Noto+Sans+KR',
  th: 'Noto+Sans+Thai',
  unknown: 'Noto+Sans',
}

function withCache(fn) {
  const cache = new Map()
  return async (...args) => {
    const key = args.join('|')
    if (cache.has(key)) return cache.get(key)
    const result = await fn(...args)
    cache.set(key, result)
    return result
  }
}

const loadDynamicAsset = withCache(async (code, text) => {
  const emojiCodes = getTwemojiMap(text)
  const emojis = Object.values(emojiCodes)
  if (emojis.length) {
    // It's an emoji, load the image.
    return (
      `data:image/svg+xml;base64,` +
      btoa(await (await loadEmoji(emojis[0])).text())
    )
  }

  // Try to load from Google Fonts.
  if (!languageFontMap[code]) code = 'unknown'

  try {
    const data = await (
      await fetch(
        `/api/font?font=${encodeURIComponent(
          languageFontMap[code]
        )}&text=${encodeURIComponent(text)}`
      )
    ).arrayBuffer()

    if (data) {
      return {
        name: `satori_${code}_fallback_${text}`,
        data,
        weight: 400,
        style: 'normal',
      }
    }
  } catch (e) {
    console.error('Failed to load dynamic font for', text, '. Error:', e)
  }
})

async function init() {
  if (typeof window === 'undefined') return []

  const [_, font, fontBold, fontIcon] =
    window.__resource ||
    (window.__resource = await Promise.all([
      fetch(
        'https://unpkg.com/@resvg/resvg-wasm@2.0.0-alpha.4/index_bg.wasm'
      ).then((res) => resvg.initWasm(res)),
      ...(
        await Promise.all([
          fetch(
            'https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-400-normal.woff'
          ),
          fetch(
            'https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-700-normal.woff'
          ),
          fetch(
            'https://unpkg.com/@fontsource/material-icons@4.5.2/files/material-icons-base-400-normal.woff'
          ),
        ])
      ).map((res) => res.arrayBuffer()),
    ]))

  return [
    {
      name: 'Inter',
      data: font,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Inter',
      data: fontBold,
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Material Icons',
      data: fontIcon,
      weight: 400,
      style: 'normal',
    },
  ]
}

const loadFonts = init()

function Tabs({ options, onChange, children }) {
  const [active, setActive] = useState(options[0])

  return (
    <div className='tabs'>
      <div className='tabs-container'>
        {options.map((option) => (
          <div
            className={'tab' + (active === option ? ' active' : '')}
            key={option}
            onClick={() => {
              setActive(option)
              onChange(option)
            }}
          >
            {option}
          </div>
        ))}
      </div>
      {children}
    </div>
  )
}

const LiveSatori = withLive(function ({ live }) {
  const [options, setOptions] = useState(null)
  const [debug, setDebug] = useState(false)
  const [fontEmbed, setFontEmbed] = useState(true)
  const [native, setNative] = useState(false)
  const [png, setPNG] = useState(false)
  const [pngUrl, setPNGUrl] = useState(null)
  const [width, setWidth] = useState(400 * 2)
  const [height, setHeight] = useState(200 * 2)
  const [iframeNode, setIframeNode] = useState(null)
  const [scaleRatio, setScaleRatio] = useState(1)

  const sizeRef = useRef([width, height])
  sizeRef.current = [width, height]

  function updateScaleRatio() {
    const [w, h] = sizeRef.current
    const innerWidth = window.innerWidth
    const containerWidth =
      innerWidth < 600 ? innerWidth - 20 : innerWidth / 2 - 15
    const containerHeight = (containerWidth * 9) / 16
    setScaleRatio(
      Math.min(1, Math.min(containerWidth / w, containerHeight / h))
    )
  }

  useEffect(() => {
    ;(async () => {
      setOptions({
        fonts: await loadFonts,
      })
    })()
  }, [])

  useEffect(() => {
    let timeout
    const onResize = () => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        updateScaleRatio()
      }, 50)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    updateScaleRatio()
  }, [width, height])

  const [result, setResult] = useState('')
  const [renderedTimeSpent, setRenderTime] = useState()

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      // We leave a small buffer here to debounce if it's PNG.
      if (png) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
      if (cancelled) return

      let _result = ''
      let _renderedTimeSpent

      if (live.element && options) {
        const start = (
          typeof performance !== 'undefined' ? performance : Date
        ).now()
        if (!native) {
          try {
            _result = await satori(live.element.prototype.render(), {
              ...options,
              embedFont: fontEmbed,
              width,
              height,
              debug,
              loadAdditionalAsset: loadDynamicAsset,
            })
            if (png) {
              const renderer = new resvg.Resvg(_result, {
                fitTo: {
                  mode: 'width',
                  value: width,
                },
              })
              const pngData = renderer.render()
              setPNGUrl(
                URL.createObjectURL(new Blob([pngData], { type: 'image/png' }))
              )
            }
          } catch (e) {
            console.error(e)
            return null
          }
        }
        _renderedTimeSpent =
          (typeof performance !== 'undefined' ? performance : Date).now() -
          start
      }

      setResult(_result)
      setRenderTime(_renderedTimeSpent)
    })()

    return () => {
      cancelled = true
    }
  }, [live.element, options, width, height, debug, fontEmbed, native, png])

  return (
    <>
      <Tabs
        options={['SVG (Satori)', 'PNG (Satori + Resvg-js)', 'HTML (Native)']}
        onChange={(type) => {
          setNative(type.startsWith('HTML'))
          setPNG(type.startsWith('PNG'))
        }}
      >
        <div className='preview-card'>
          {live.error ? (
            <div className='error'>
              <pre>{live.error}</pre>
            </div>
          ) : null}
          <div
            className='svg-container'
            dangerouslySetInnerHTML={
              native
                ? undefined
                : png
                ? undefined
                : {
                    __html: `<div style="position:absolute;width:${width}px;height:${height}px;transform:scale(${scaleRatio});display:flex;align-items:center;justify-content:center">${result}</div>`,
                  }
            }
          >
            {native ? (
              <iframe
                ref={(node) => {
                  if (node) {
                    setIframeNode(node.contentWindow?.document?.body)
                  }
                }}
                width={width}
                height={height}
                style={{
                  transform: `scale(${scaleRatio})`,
                }}
              >
                {iframeNode &&
                  createPortal(
                    <>
                      <style
                        dangerouslySetInnerHTML={{
                          __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Material+Icons');*{box-sizing:border-box}body{display:flex;height:100%;margin:0;font-family:Inter,sans-serif;align-items:center;justify-content:center;overflow:hidden}`,
                        }}
                      />
                      {live.element ? <live.element /> : null}
                    </>,
                    iframeNode
                  )}
              </iframe>
            ) : png && pngUrl ? (
              <img
                src={pngUrl}
                width={width}
                height={height}
                style={{
                  transform: `scale(${scaleRatio})`,
                }}
                alt='Preview'
              />
            ) : null}
          </div>
          <footer>
            <span className='ellipsis'>
              {native
                ? `[HTML] Rendered by browser.`
                : png
                ? `[PNG] Generated by Satori and Resvg-js in `
                : `[SVG] Generated by Satori in `}
            </span>
            <span className='data'>
              {native ? '' : `${~~(renderedTimeSpent * 100) / 100}ms.`}
            </span>
            <span>{`[${width}×${height}]`}</span>
          </footer>
        </div>
      </Tabs>
      <div className='controller'>
        <h2 className='title'>Configurations</h2>
        <div className='content'>
          <div className='control'>
            <label htmlFor='width'>Container Width</label>
            <div>
              <input
                type='range'
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                min={100}
                max={1000}
                step={1}
              />
              <input
                id='width'
                type='number'
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                min={100}
                max={1000}
                step={1}
              />
              px
            </div>
          </div>
          <div className='control'>
            <label htmlFor='height'>Container Height</label>
            <div>
              <input
                type='range'
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min={100}
                max={1000}
                step={1}
              />
              <input
                id='height'
                type='number'
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min={100}
                max={1000}
                step={1}
              />
              px
            </div>
          </div>
          <div className='control'>
            <label htmlFor='reset'>Reset Size</label>
            <button
              id='reset'
              onClick={() => {
                setWidth(400 * 2)
                setHeight(200 * 2)
              }}
            >
              Reset to 2:1
            </button>
          </div>
          <div className='control'>
            <label htmlFor='debug'>Debug Mode</label>
            <input
              id='debug'
              type='checkbox'
              checked={debug}
              onChange={() => setDebug(!debug)}
            />
          </div>
          <div className='control'>
            <label htmlFor='font'>Embed Font</label>
            <input
              id='font'
              type='checkbox'
              checked={fontEmbed}
              onChange={() => setFontEmbed(!fontEmbed)}
            />
          </div>
          <div className='control'>
            <label htmlFor='export'>Export</label>
            <a
              className={!result || native ? 'disabled' : ''}
              href={
                result
                  ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                      result
                    )}`
                  : undefined
              }
              target={result ? '_blank' : ''}
              download={result ? 'satori-playground.svg' : false}
            >
              Export SVG
            </a>
          </div>
          <div className='control'>
            <label>Satori Version</label>
            <span>{packageJson.version}</span>
          </div>
        </div>
      </div>
    </>
  )
})

const cardNames = Object.keys(cards)

export default function Playground() {
  const [activeCard, setActiveCard] = useState(cardNames[0])

  return (
    <>
      <nav>
        <h1>Satori Playground</h1>
        <ul>
          <li>
            <a href='https://nextjs.org/discord'>Discord</a>
          </li>
          <li>
            <a href='https://github.com/vercel/satori'>GitHub</a>
          </li>
        </ul>
      </nav>
      <div className='container'>
        <LiveProvider
          theme={{
            plain: {
              color: '#111',
            },
            styles: [
              {
                types: ['prolog', 'comment', 'doctype', 'cdata'],
                style: {
                  color: 'hsl(30, 20%, 50%)',
                },
              },
              {
                types: [
                  'property',
                  'tag',
                  'boolean',
                  'number',
                  'constant',
                  'symbol',
                ],
                style: {
                  color: '#111',
                },
              },
              {
                types: ['attr-name', 'string', 'char', 'builtin', 'insterted'],
                style: {
                  color: '#0076ff',
                },
              },
              {
                types: [
                  'entity',
                  'url',
                  'string',
                  'variable',
                  'language-css',
                  'number',
                ],
                style: {
                  color: '#028265',
                },
              },
              {
                types: ['deleted'],
                style: {
                  color: 'rgb(255, 85, 85)',
                },
              },
              {
                types: ['italic'],
                style: {
                  fontStyle: 'italic',
                },
              },
              {
                types: ['important', 'bold'],
                style: {
                  fontWeight: 'bold',
                },
              },
              {
                types: ['regex', 'important'],
                style: {
                  color: '#e90',
                },
              },
              {
                types: ['atrule', 'attr-value', 'keyword'],
                style: {
                  color: '#f677e1',
                },
              },
              {
                types: ['punctuation', 'symbol', 'operator'],
                style: {
                  color: '#898989',
                },
              },
            ],
          }}
          code={cards[activeCard]}
        >
          <Tabs
            options={cardNames}
            onChange={(name) => {
              setActiveCard(name)
            }}
          >
            <div className='editor'>
              <LiveEditor key={activeCard} />
            </div>
          </Tabs>
          <div className='preview'>
            <LiveSatori />
          </div>
        </LiveProvider>
      </div>
      <Head>
        <title>Satori Playground</title>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        />
        <meta name='description' content='Satori Playground' />
        <meta name='theme-color' content='#fff' />
        <link
          rel='icon'
          href='data:image/svg+xml;utf8,&lt;svg xmlns=&#x27;http://www.w3.org/2000/svg&#x27; viewBox=&#x27;0 0 100 100&#x27;&gt;&lt;text x=&#x27;50&#x27; y=&#x27;.9em&#x27; font-size=&#x27;90&#x27; text-anchor=&#x27;middle&#x27;&gt;🄪&lt;/text&gt;&lt;style&gt;text{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";fill:black}@media(prefers-color-scheme:dark){text{fill:white}}&lt;/style&gt;&lt;/svg&gt;'
        />
      </Head>
    </>
  )
}
