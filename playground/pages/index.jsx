import satori, { init as initSatori } from 'satori/wasm'
import { LiveProvider, LiveContext, withLive } from 'react-live'
import { useEffect, useState, useRef, useContext } from 'react'
import { createPortal } from 'react-dom'
import Head from 'next/head'
import Editor, { useMonaco } from '@monaco-editor/react'
import toast, { Toaster } from 'react-hot-toast'
import copy from 'copy-to-clipboard'
import packageJson from 'satori/package.json'
import * as resvg from '@resvg/resvg-wasm'
import { initStreaming } from 'yoga-wasm-web'

import { loadEmoji, getIconCode } from '../utils/twemoji'

import cards from '../cards/data'

const cardNames = Object.keys(cards)
const editedCards = { ...cards }

// @TODO: Support font style and weights, and make this option extensible rather
// than built-in.
// @TODO: Cover most languages with Noto Sans.
// @TODO: Fix CJK missing punctuations, maybe inline guessLanguage?
const languageFontMap = {
  zh: 'Noto+Sans+SC',
  ja: 'Noto+Sans+JP',
  ko: 'Noto+Sans+KR',
  th: 'Noto+Sans+Thai',
  he: 'Noto+Sans+Hebrew',
  ar: 'Noto+Sans+Arabic',
  bn: 'Noto+Sans+Bengali',
  ta: 'Noto+Sans+Tamil',
  te: 'Noto+Sans+Telugu',
  ml: 'Noto+Sans+Malayalam',
  devanagari: 'Noto+Sans+Devanagari',
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
  if (code === 'emoji') {
    // It's an emoji, load the image.
    return (
      `data:image/svg+xml;base64,` +
      btoa(await (await loadEmoji(getIconCode(text))).text())
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

// https://raw.githubusercontent.com/n3r4zzurr0/svg-spinners/main/svg/90-ring.svg
const spinner = (
  <svg
    width='24'
    height='24'
    viewBox='0 0 24 24'
    xmlns='http://www.w3.org/2000/svg'
    style={{
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      margin: 'auto',
      fill: 'white',
      zIndex: 1,
    }}
  >
    <path d='M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z'>
      <animateTransform
        attributeName='transform'
        type='rotate'
        dur='0.75s'
        values='0 12 12;360 12 12'
        repeatCount='indefinite'
      />
    </path>
  </svg>
)

async function init() {
  if (typeof window === 'undefined') return []

  const [_, __, font, fontBold, fontIcon] =
    window.__resource ||
    (window.__resource = await Promise.all([
      fetch(
        'https://unpkg.com/@resvg/resvg-wasm@2.0.0-alpha.4/index_bg.wasm'
      ).then((res) => resvg.initWasm(res)),
      fetch('https://unpkg.com/yoga-wasm-web@0.1.2/dist/yoga.wasm')
        .then((res) => initStreaming(res))
        .then((yoga) => initSatori(yoga)),
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
            title={option}
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

function LiveEditor({ id }) {
  const { onChange } = useContext(LiveContext)
  const monaco = useMonaco()
  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('IDLE', {
        base: 'vs',
        inherit: false,
        rules: [
          {
            background: 'FFFFFF',
            token: '',
          },
          {
            foreground: '919191',
            token: 'comment',
          },
          {
            foreground: '00a33f',
            token: 'string',
          },
          {
            foreground: 'a535ae',
            token: 'constant.language',
          },
          {
            foreground: 'ff5600',
            token: 'keyword',
          },
          {
            foreground: 'ff5600',
            token: 'storage',
          },
          {
            foreground: '21439c',
            token: 'entity.name.type',
          },
          {
            foreground: '21439c',
            token: 'entity.name.function',
          },
          {
            foreground: 'a535ae',
            token: 'support.function',
          },
          {
            foreground: 'a535ae',
            token: 'support.constant',
          },
          {
            foreground: 'a535ae',
            token: 'support.type',
          },
          {
            foreground: 'a535ae',
            token: 'support.class',
          },
          {
            foreground: 'a535ae',
            token: 'support.variable',
          },
          {
            foreground: '000000',
            background: '990000',
            token: 'invalid',
          },
          {
            foreground: '990000',
            token: 'constant.other.placeholder.py',
          },
        ],
        colors: {
          'editor.foreground': '#000000',
          'editor.background': '#FFFFFF',
          'editor.selectionBackground': '#BAD6FD',
          'editor.lineHighlightBackground': '#00000012',
          'editorCursor.foreground': '#000000',
          'editorWhitespace.foreground': '#BFBFBF',
        },
      })
      monaco.editor.setTheme('IDLE')
    }
  }, [monaco])

  return (
    <Editor
      height='100%'
      theme='IDLE'
      defaultLanguage='javascript'
      value={editedCards[id]}
      onChange={(newCode) => {
        // We also update the code in memory so switching tabs will preserve the
        // edited code (until refreshing).
        editedCards[id] = newCode
        onChange(newCode)
      }}
      options={{
        fontFamily: 'iaw-mono-var',
        fontSize: 14,
        wordWrap: 'on',
        tabSize: 2,
        minimap: {
          enabled: false,
        },
        smoothScrolling: true,
        contextmenu: false,
      }}
    />
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
  const [loadingResources, setLoadingResources] = useState(true)

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
      setLoadingResources(false)
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
        await new Promise((resolve) => setTimeout(resolve, 15))
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
      <Toaster
        toastOptions={{
          style: {
            fontSize: 13,
            borderRadius: 6,
            padding: '2px 4px 2px 12px',
          },
        }}
      />
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
          {loadingResources ? spinner : null}
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
                          __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Material+Icons');body{display:flex;height:100%;margin:0;font-family:Inter,sans-serif;overflow:hidden}body>div,body>div *{box-sizing:border-box;display:flex}`,
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
              Reset
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

function ResetCode({ activeCard }) {
  const { onChange } = useContext(LiveContext)

  useEffect(() => {
    const params = new URL(document.location).searchParams
    const shared = params.get('share')
    if (shared) {
      try {
        const card = decodeURIComponent(
          atob(shared.replace(/-/g, '+').replace(/_/g, '='))
        )
        editedCards[activeCard] = card
        onChange(editedCards[activeCard])
      } catch (e) {
        console.error('Failed to parse shared card:', e)
      }
    }
  }, [])

  return (
    <button
      onClick={() => {
        editedCards[activeCard] = cards[activeCard]
        onChange(editedCards[activeCard])
      }}
    >
      Reset
    </button>
  )
}

export default function Playground() {
  const [activeCard, setActiveCard] = useState(cardNames[0])

  return (
    <>
      <nav>
        <h1>Satori Playground</h1>
        <ul>
          <li>
            <a href='https://github.com/vercel/satori'>Documentation</a>
          </li>
          <li>
            <a href='https://nextjs.org/discord'>Discord</a>
          </li>
          <li>
            <a href='https://github.com/vercel/satori'>GitHub</a>
          </li>
        </ul>
      </nav>
      <div className='container'>
        <LiveProvider code={editedCards[activeCard]}>
          <Tabs
            options={cardNames}
            onChange={(name) => {
              setActiveCard(name)
            }}
          >
            <div className='editor'>
              <div className='editor-controls'>
                <ResetCode activeCard={activeCard} />
                <button
                  onClick={() => {
                    const code = editedCards[activeCard]
                    const data = btoa(encodeURIComponent(code))
                      .replace(/\+/g, '-')
                      .replace(/=/g, '_')
                    window.history.replaceState(null, null, '?share=' + data)
                    copy(window.location.href)
                    toast.success('Copied to clipboard')
                  }}
                >
                  Share
                </button>
              </div>
              <div className='monaco-container'>
                <LiveEditor key={activeCard} id={activeCard} />
              </div>
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
          rel='preload'
          href='https://unpkg.com/@resvg/resvg-wasm@2.0.0-alpha.4/index_bg.wasm'
          as='fetch'
          crossOrigin='anonymous'
        />
        <link
          rel='preload'
          href='https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-400-normal.woff'
          as='fetch'
          crossOrigin='anonymous'
        />
        <link
          rel='preload'
          href='https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-700-normal.woff'
          as='fetch'
          crossOrigin='anonymous'
        />
        <link
          rel='preload'
          href='https://unpkg.com/@fontsource/material-icons@4.5.2/files/material-icons-base-400-normal.woff'
          as='fetch'
          crossOrigin='anonymous'
        />
        <link
          rel='icon'
          href='data:image/svg+xml;utf8,&lt;svg xmlns=&#x27;http://www.w3.org/2000/svg&#x27; viewBox=&#x27;0 0 100 100&#x27;&gt;&lt;text x=&#x27;50&#x27; y=&#x27;.9em&#x27; font-size=&#x27;90&#x27; text-anchor=&#x27;middle&#x27;&gt;🄪&lt;/text&gt;&lt;style&gt;text{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji";fill:black}@media(prefers-color-scheme:dark){text{fill:white}}&lt;/style&gt;&lt;/svg&gt;'
        />
      </Head>
    </>
  )
}
