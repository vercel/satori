import satori from 'satori'
import { LiveProvider, LiveContext, withLive } from 'react-live'
import { useEffect, useState, useRef, useContext } from 'react'
import { createPortal } from 'react-dom'
import Editor, { useMonaco } from '@monaco-editor/react'
import toast, { Toaster } from 'react-hot-toast'
import copy from 'copy-to-clipboard'
import packageJson from 'satori/package.json'
import * as resvg from '@resvg/resvg-wasm'
import * as fflate from 'fflate'
import { Base64 } from 'js-base64'
import PDFDocument from 'pdfkit/js/pdfkit.standalone.js'
import SVGtoPDF from 'svg-to-pdfkit'
import blobStream from 'blob-stream'
import { createIntlSegmenterPolyfill } from 'intl-segmenter-polyfill'

import { loadEmoji, getIconCode } from '../utils/twemoji'
import Introduction from '../components/introduction'

import cards from '../cards/data'

const cardNames = Object.keys(cards)
const editedCards = { ...cards }

// @TODO: Support font style and weights, and make this option extensible rather
// than built-in.
// @TODO: Cover most languages with Noto Sans.
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

const loadDynamicAsset = withCache(async (emojiType, code, text) => {
  if (code === 'emoji') {
    // It's an emoji, load the image.
    return (
      `data:image/svg+xml;base64,` +
      btoa(await (await loadEmoji(emojiType, getIconCode(text))).text())
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

async function initResvg() {
  if (typeof window === 'undefined') return
  if (globalThis.resvgInitialized) return
  globalThis.resvgInitialized = true

  // Can always be delayed a bit to unblock other resources.
  await new Promise((resolve) => setTimeout(resolve, 500))
  await fetch('/resvg.wasm').then((res) => resvg.initWasm(res))
}

async function init() {
  if (typeof window === 'undefined') return []

  const [font, fontBold, fontIcon, Segmenter] =
    window.__resource ||
    (window.__resource = await Promise.all([
      fetch('/inter-latin-ext-400-normal.woff').then((res) =>
        res.arrayBuffer()
      ),
      fetch('/inter-latin-ext-700-normal.woff').then((res) =>
        res.arrayBuffer()
      ),
      fetch('/material-icons-base-400-normal.woff').then((res) =>
        res.arrayBuffer()
      ),
      !globalThis.Intl || !globalThis.Intl.Segmenter
        ? createIntlSegmenterPolyfill(fetch('/break_iterator.wasm'))
        : null,
    ]))

  if (Segmenter) {
    globalThis.Intl = globalThis.Intl || {}
    globalThis.Intl.Segmenter = Segmenter
  }

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
const loadResvg = initResvg()

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
            token: 'delimiter',
            foreground: '999999',
          },
          {
            token: 'aaa',
            foreground: '00ff00',
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
            foreground: '3b54bf',
            token: 'number',
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
      defaultLanguage='typescript'
      value={editedCards[id]}
      onChange={(newCode) => {
        // We also update the code in memory so switching tabs will preserve the
        // edited code (until refreshing).
        editedCards[id] = newCode
        onChange(newCode)
      }}
      onMount={async (editor, monaco) => {
        const modelUri = monaco.Uri.file('satori.tsx')
        const codeModel = monaco.editor.createModel(
          editedCards[id],
          'typescript',
          modelUri // Pass the file name to the model here.
        )
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
          jsx: 'react',
        })
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({})
        editor.setModel(codeModel)
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
        cursorSmoothCaretAnimation: true,
        contextmenu: false,
      }}
    />
  )
}

// For sharing & resuming.
const currentOptions = {}
let overrideOptions

const LiveSatori = withLive(function ({ live }) {
  const [options, setOptions] = useState(null)
  const [debug, setDebug] = useState(false)
  const [fontEmbed, setFontEmbed] = useState(true)
  const [emojiType, setEmojiType] = useState('twemoji')
  const [objectURL, setObjectURL] = useState(null)
  const [renderType, setRenderType] = useState('svg')
  const [renderError, setRenderError] = useState(null)
  const [width, setWidth] = useState(400 * 2)
  const [height, setHeight] = useState(200 * 2)
  const [iframeNode, setIframeNode] = useState(null)
  const [scaleRatio, setScaleRatio] = useState(1)
  const [loadingResources, setLoadingResources] = useState(true)

  useEffect(() => {
    if (overrideOptions) {
      setWidth(Math.min(overrideOptions.width || 800, 2000))
      setHeight(Math.min(overrideOptions.height || 800, 2000))
      setDebug(!!overrideOptions.debug)
      setEmojiType(overrideOptions.emojiType || 'twemoji')
      setFontEmbed(!!overrideOptions.fontEmbed)
      overrideOptions = null
    }
  }, [overrideOptions])

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
      if (renderType === 'png') {
        await new Promise((resolve) => setTimeout(resolve, 15))
      }
      if (cancelled) return

      let _result = ''
      let _renderedTimeSpent

      if (live.element && options) {
        const start = (
          typeof performance !== 'undefined' ? performance : Date
        ).now()
        if (renderType !== 'html') {
          try {
            _result = await satori(live.element.prototype.render(), {
              ...options,
              embedFont: fontEmbed,
              width,
              height,
              debug,
              loadAdditionalAsset: (...args) =>
                loadDynamicAsset(emojiType, ...args),
            })
            if (renderType === 'png') {
              await loadResvg
              const renderer = new resvg.Resvg(_result, {
                fitTo: {
                  mode: 'width',
                  value: width,
                },
              })
              const pngData = renderer.render()
              setObjectURL(
                URL.createObjectURL(new Blob([pngData], { type: 'image/png' }))
              )
              // After rendering the PNG @1x quickly, we render the PNG @2x for
              // the playground only to make it look less blurry.
              setTimeout(() => {
                if (cancelled) return
                const renderer = new resvg.Resvg(_result, {
                  fitTo: {
                    mode: 'width',
                    value: width * 2,
                  },
                })
                const pngData = renderer.render()
                setObjectURL(
                  URL.createObjectURL(
                    new Blob([pngData], { type: 'image/png' })
                  )
                )
              }, 20)
            }
            if (renderType === 'pdf') {
              const doc = new PDFDocument({
                compress: false,
                size: [width, height],
              })
              SVGtoPDF(doc, _result, 0, 0, {
                width,
                height,
                preserveAspectRatio: `xMidYMid meet`,
              })
              const stream = doc.pipe(blobStream())
              stream.on('finish', () => {
                const blob = stream.toBlob('application/pdf')
                setObjectURL(URL.createObjectURL(blob))
              })
              doc.end()
            }
            setRenderError(null)
          } catch (e) {
            console.error(e)
            setRenderError(e.message)
            return null
          }
        } else {
          setRenderError(null)
        }
        _renderedTimeSpent =
          (typeof performance !== 'undefined' ? performance : Date).now() -
          start
      }

      Object.assign(currentOptions, {
        width,
        height,
        debug,
        emojiType,
        fontEmbed,
      })
      setResult(_result)
      setRenderTime(_renderedTimeSpent)
    })()

    return () => {
      cancelled = true
    }
  }, [live.element, options, width, height, debug, emojiType, fontEmbed, renderType])

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
        options={[
          'SVG (Satori)',
          'PNG (Satori + Resvg-js)',
          'PDF (Satori + PDFKit)',
          'HTML (Native)',
        ]}
        onChange={(text) => {
          const renderType = text.split(' ')[0].toLowerCase()
          // 'svg' | 'png' | 'html' | 'pdf'
          setRenderType(renderType)
        }}
      >
        <div className='preview-card'>
          {live.error || renderError ? (
            <div className='error'>
              <pre>{live.error || renderError}</pre>
            </div>
          ) : null}
          {loadingResources ? spinner : null}
          <div
            className='svg-container'
            dangerouslySetInnerHTML={
              renderType !== 'svg'
                ? undefined
                : {
                    __html: `<div style="position:absolute;width:${width}px;height:${height}px;transform:scale(${scaleRatio});display:flex;align-items:center;justify-content:center">${result}</div>`,
                  }
            }
          >
            {renderType === 'html' ? (
              <iframe
                key='html'
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
            ) : renderType === 'png' && objectURL ? (
              <img
                src={objectURL}
                width={width}
                height={height}
                style={{
                  transform: `scale(${scaleRatio})`,
                }}
                alt='Preview'
              />
            ) : renderType === 'pdf' && objectURL ? (
              <iframe
                key='pdf'
                width={width}
                height={height}
                src={
                  objectURL +
                  '#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&scrollbar=0'
                }
                style={{
                  transform: `scale(${scaleRatio})`,
                }}
              />
            ) : null}
          </div>
          <footer>
            <span className='ellipsis'>
              {renderType === 'html'
                ? '[HTML] Rendered.'
                : `[${renderType.toUpperCase()}] Generated in `}
            </span>
            <span className='data'>
              {renderType === 'html'
                ? ''
                : `${~~(renderedTimeSpent * 100) / 100}ms.`}
              {renderType === 'pdf' || renderType === 'png' ? (
                <>
                  {' '}
                  <a href={objectURL} target='_blank'>
                    (View in New Tab ↗)
                  </a>
                </>
              ) : (
                ''
              )}
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
            <label htmlFor='emoji'>Emoji Provider</label>
            <select
              id='emoji'
              onChange={(e) => setEmojiType(e.target.value)}
              value={emojiType}
            >
              <option value='twemoji'>Twemoji</option>
              <option value='fluent'>Fluent Emoji</option>
              <option value='fluentFlat'>Fluent Emoji Flat</option>
              <option value='noto'>Noto Emoji</option>
              <option value='blobmoji'>Blobmoji</option>
              <option value='openmoji'>OpenMoji</option>
            </select>
          </div>
          <div className='control'>
            <label htmlFor='export'>Export</label>
            <a
              className={!result || renderType === 'html' ? 'disabled' : ''}
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
            <a
              className={!result || renderType === 'html' ? 'disabled' : ''}
              href='#'
              onClick={(e) => {
                e.preventDefault()
                if (!result) return false
                window.open('').document.write(result)
              }}
            >
              (View in New Tab ↗)
            </a>
          </div>
          <div className='control'>
            <label>Satori Version</label>
            <a href='https://github.com/vercel/satori' target='_blank'>
              {packageJson.version}
            </a>
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
        const data = fflate.strFromU8(
          fflate.decompressSync(Base64.toUint8Array(shared))
        )

        let card
        try {
          const decoded = JSON.parse(data)
          card = decoded.code
          overrideOptions = decoded.options
        } catch (e) {
          card = data
        }

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
        window.history.replaceState(null, null, '/')
        toast.success('Content reset')
      }}
    >
      Reset
    </button>
  )
}

export default function Playground() {
  const [activeCard, setActiveCard] = useState(cardNames[0])
  const [showIntroduction, setShowIntroduction] = useState(false)

  useEffect(() => {
    try {
      const hasVisited = localStorage.getItem('_vercel_og_playground_visited')
      if (hasVisited) return
    } catch (e) {}

    setShowIntroduction(true)
  }, [])

  return (
    <>
      {showIntroduction ? (
        <Introduction
          onClose={() => {
            setShowIntroduction(false)
            localStorage.setItem('_vercel_og_playground_visited', '1')
          }}
        />
      ) : null}
      <nav>
        <h1>
          <svg viewBox='0 0 75 65' fill='#000' height='12' title='Vercel'>
            <path d='M37.59.25l36.95 64H.64l36.95-64z'></path>
          </svg>
          OG Image Playground
        </h1>
        <ul>
          <li>
            <a href='https://vercel.com/docs/concepts/functions/edge-functions/og-image-generation'>
              Docs
            </a>
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
                    const compressed = Base64.fromUint8Array(
                      fflate.deflateSync(
                        fflate.strToU8(
                          JSON.stringify({
                            code,
                            options: currentOptions,
                          })
                        )
                      ),
                      true
                    )

                    window.history.replaceState(
                      null,
                      null,
                      '?share=' + compressed
                    )
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
    </>
  )
}
