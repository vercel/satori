import React from 'react'
import satori from 'satori'
import { LiveProvider, LiveContext, withLive } from 'react-live'
import { useEffect, useState, useRef, useContext, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Editor, { useMonaco } from '@monaco-editor/react'
import toast, { Toaster } from 'react-hot-toast'
import copy from 'copy-to-clipboard'
import packageJson from 'satori/package.json'
import * as fflate from 'fflate'
import { Base64 } from 'js-base64'
import PDFDocument from 'pdfkit/js/pdfkit.standalone'
import SVGtoPDF from 'svg-to-pdfkit'
import blobStream from 'blob-stream'
import { createIntlSegmenterPolyfill } from 'intl-segmenter-polyfill'
import { Panel, PanelGroup } from 'react-resizable-panels'

import { loadEmoji, getIconCode, apis } from '../utils/twemoji'
import Introduction from '../components/introduction'
import PanelResizeHandle from '../components/panel-resize-handle'
import { languageFontMap } from '../utils/font'

import playgroundTabs, { Tabs } from '../cards/playground-data'
import previewTabs from '../cards/preview-tabs'

const cardNames = Object.keys(playgroundTabs)
const editedCards: Tabs = { ...playgroundTabs }

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
        ? createIntlSegmenterPolyfill(
            fetch(
              new URL(
                'intl-segmenter-polyfill/dist/break_iterator.wasm',
                import.meta.url
              )
            )
          )
        : null,
    ]))

  if (Segmenter) {
    globalThis.Intl = globalThis.Intl || {}
    //@ts-expect-error
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

function withCache(fn: Function) {
  const cache = new Map()
  return async (...args: string[]) => {
    const key = args.join(':')
    if (cache.has(key)) return cache.get(key)
    const result = await fn(...args)
    cache.set(key, result)
    return result
  }
}

type LanguageCode = keyof typeof languageFontMap | 'emoji'

const loadDynamicAsset = withCache(
  async (emojiType: keyof typeof apis, _code: string, text: string) => {
    if (_code === 'emoji') {
      // It's an emoji, load the image.
      return (
        `data:image/svg+xml;base64,` +
        btoa(await loadEmoji(emojiType, getIconCode(text)))
      )
    }

    const codes = _code.split('|')

    // Try to load from Google Fonts.
    const names = codes
      .map((code) => languageFontMap[code as keyof typeof languageFontMap])
      .filter(Boolean)

    if (names.length === 0) return []

    const params = new URLSearchParams()
    for (const name of names.flat()) {
      params.append('fonts', name)
    }
    params.set('text', text)

    try {
      const response = await fetch(`/api/font?${params.toString()}`)

      if (response.status === 200) {
        const data = await response.arrayBuffer()
        const fonts: any[] = []

        // Decode the encoded font format.
        const decodeFontInfoFromArrayBuffer = (buffer: ArrayBuffer) => {
          let offset = 0
          const bufferView = new Uint8Array(buffer)

          while (offset < bufferView.length) {
            // 1 byte for font name length.
            const languageCodeLength = bufferView[offset]
            offset += 1
            let languageCode = ''
            for (let i = 0; i < languageCodeLength; i++) {
              languageCode += String.fromCharCode(bufferView[offset + i])
            }
            offset += languageCodeLength

            // 4 bytes for font data length.
            const fontDataLength = new DataView(buffer).getUint32(offset, false)
            offset += 4
            const fontData = buffer.slice(offset, offset + fontDataLength)
            offset += fontDataLength

            fonts.push({
              name: `satori_${languageCode}_fallback_${text}`,
              data: fontData,
              weight: 400,
              style: 'normal',
              lang: languageCode === 'unknown' ? undefined : languageCode,
            })
          }
        }

        decodeFontInfoFromArrayBuffer(data)

        return fonts
      }
    } catch (e) {
      console.error('Failed to load dynamic font for', text, '. Error:', e)
    }
  }
)

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

function initResvgWorker() {
  if (typeof window === 'undefined') return

  const worker = new Worker(
    new URL('../components/resvg_worker.ts', import.meta.url)
  )

  const pending = new Map()
  worker.onmessage = (e) => {
    const { _id, url } = e.data
    const resolve = pending.get(_id)
    if (resolve) {
      resolve(url)
      pending.delete(_id)
    }
  }

  return async (msg: object) => {
    const _id = Math.random()
    worker.postMessage({
      ...msg,
      _id,
    })
    return new Promise((resolve) => {
      pending.set(_id, resolve)
    })
  }
}

const loadFonts = init()
const renderPNG = initResvgWorker()

interface ITabs {
  options: string[]
  onChange: (value: string) => void
  children: React.ReactNode
}

function Tabs({ options, onChange, children }: ITabs) {
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

function LiveEditor({ id }: { id: string }) {
  const { onChange } = useContext(LiveContext) as unknown as {
    onChange: (val: string) => void
  }

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

  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} style={{ height: '100%', position: 'relative' }}>
      <div style={{ position: 'absolute' }}>
        <Editor
          height='100%'
          theme='IDLE'
          defaultLanguage='javascript'
          value={editedCards[id]}
          onChange={(newCode) => {
            // We also update the code in memory so switching tabs will preserve the
            // edited code (until refreshing).
            editedCards[id] = newCode ?? ''
            onChange(newCode ?? '')
          }}
          onMount={async (editor, _monaco) => {
            if (ref.current) {
              const relayout = ([e]: any) => {
                editor.layout({
                  width: e.borderBoxSize[0].inlineSize,
                  height: e.borderBoxSize[0].blockSize,
                })
              }
              const resizeObserver = new ResizeObserver(relayout)
              resizeObserver.observe(ref.current)
            }
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
            cursorSmoothCaretAnimation: 'on',
            contextmenu: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  )
}

// For sharing & resuming.
const currentOptions = {}
let overrideOptions: any = null

const LiveSatori = withLive(function ({
  live,
}: {
  live?: { element: React.ComponentType; error: string }
}) {
  const [options, setOptions] = useState<object | null>(null)
  const [debug, setDebug] = useState(false)
  const [fontEmbed, setFontEmbed] = useState(true)
  const [emojiType, setEmojiType] = useState('twemoji')
  const [objectURL, setObjectURL] = useState<string>('')
  const [renderType, setRenderType] = useState('svg')
  const [renderError, setRenderError] = useState(null)
  const [width, setWidth] = useState(400 * 2)
  const [height, setHeight] = useState(200 * 2)
  const [iframeNode, setIframeNode] = useState<HTMLElement | undefined>()
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [scaleRatio, setScaleRatio] = useState(1)
  const [loadingResources, setLoadingResources] = useState(true)
  const updateIframeRef = useCallback(
    (node: HTMLIFrameElement) => {
      if (node) {
        if (node.contentWindow?.document) {
          /* Force tailwindcss to create stylesheets on first render */
          const forceUpdate = () => {
            return setTimeout(() => {
              const div = doc.createElement('div')
              div.classList.add('hidden')
              doc.body.appendChild(div)
              setTimeout(() => {
                doc.body.removeChild(div)
              }, 300)
            }, 200)
          }
          const doc = node.contentWindow.document
          const script = doc.createElement('script')
          script.src = 'https://cdn.tailwindcss.com'
          doc.head.appendChild(script)
          script.addEventListener('load', () => {
            const configScript = doc.createElement('script')
            configScript.text = `
            tailwind.config = {
              plugins: [{
                handler({ addBase }) {
                  addBase({
                    'html': {
                      'line-height': 1.2,
                    }
                  })
                }
              }]
            }
          `
            doc.head.appendChild(configScript)
          })
          const updateClass = () => {
            Array.from(doc.querySelectorAll('[tw]')).forEach((v) => {
              const tw = v.getAttribute('tw')
              if (tw) {
                v.setAttribute('class', tw)
                v.removeAttribute('tw')
              }
            })
          }
          forceUpdate()
          const observer = new MutationObserver(updateClass)
          observer.observe(doc.body, { childList: true, subtree: true })
          setIframeNode(doc.body)
        }
      }
    },
    [setIframeNode]
  ) // eslint-disable-line]
  useEffect(() => {
    if (overrideOptions) {
      setWidth(Math.min(overrideOptions.width || 800, 2000))
      setHeight(Math.min(overrideOptions.height || 800, 2000))
      setDebug(!!overrideOptions.debug)
      setEmojiType(overrideOptions.emojiType || 'twemoji')
      setFontEmbed(!!overrideOptions.fontEmbed)
    }
  }, [overrideOptions])

  const sizeRef = useRef([width, height])
  sizeRef.current = [width, height]

  function updateScaleRatio() {
    if (!previewContainerRef.current) return

    const [w, h] = sizeRef.current
    const containerWidth = previewContainerRef.current.clientWidth
    const containerHeight = previewContainerRef.current.clientHeight
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
    if (!previewContainerRef.current) return

    const observer = new ResizeObserver(updateScaleRatio)
    observer.observe(previewContainerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    updateScaleRatio()
  }, [width, height])

  const [result, setResult] = useState('')
  const [renderedTimeSpent, setRenderTime] = useState<number>(0)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      // We leave a small buffer here to debounce if it's PNG.
      if (renderType === 'png') {
        await new Promise((resolve) => setTimeout(resolve, 15))
      }
      if (cancelled) return

      let _result = ''
      let _renderedTimeSpent = 0

      if (live?.element && options) {
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
              loadAdditionalAsset: (code: string, text: string) =>
                loadDynamicAsset(emojiType, code, text),
            })
            if (renderType === 'png') {
              const url = (await renderPNG?.({
                svg: _result,
                width,
              })) as string

              if (!cancelled) {
                setObjectURL(url)

                // After rendering the PNG @1x quickly, we render the PNG @2x for
                // the playground only to make it look less blurry.
                // We only do that for images that are not too big (1200^2).
                if (width * height <= 1440000) {
                  setTimeout(async () => {
                    if (cancelled) return
                    const _url = (await renderPNG?.({
                      svg: _result,
                      width: width * 2,
                    })) as string

                    if (cancelled) return
                    setObjectURL(_url)
                  }, 20)
                }
              }
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
          } catch (e: any) {
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
  }, [
    live?.element,
    options,
    width,
    height,
    debug,
    emojiType,
    fontEmbed,
    renderType,
  ])

  return (
    <>
      <Panel>
        <Tabs
          options={previewTabs}
          onChange={(text) => {
            const _renderType = text.split(' ')[0].toLowerCase()
            // 'svg' | 'png' | 'html' | 'pdf'
            setRenderType(_renderType)
          }}
        >
          <div className='preview-card'>
            {live?.error || renderError ? (
              <div className='error'>
                <pre>{live?.error || renderError}</pre>
              </div>
            ) : null}
            {loadingResources ? spinner : null}
            <div
              className='result-container'
              ref={previewContainerRef}
              dangerouslySetInnerHTML={
                renderType !== 'svg'
                  ? undefined
                  : {
                      __html: `<div class="content-wrapper" style="position:absolute;width:100%;height:100%;max-width:${width}px;max-height:${height}px;display:flex;align-items:center;justify-content:center">${result}</div>`,
                    }
              }
            >
              {renderType === 'html' ? (
                <iframe
                  key='html'
                  ref={updateIframeRef}
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
                            __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=Material+Icons');body{display:flex;height:100%;margin:0;tab-size:8;font-family:Inter,sans-serif;overflow:hidden}body>div,body>div *{box-sizing:border-box;display:flex}`,
                          }}
                        />
                        {live?.element ? <live.element /> : null}
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
                    maxHeight: '100%',
                    maxWidth: '100%',
                    objectFit: 'contain',
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
                    <a href={objectURL ?? ''} target='_blank' rel='noreferrer'>
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
      </Panel>
      <PanelResizeHandle />
      <Panel>
        <div className='controller'>
          <h2 className='title'>Configurations</h2>
          <div className='content'>
            <div className='control'>
              <label htmlFor='width'>Container Width</label>
              <div>
                <input
                  type='range'
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min={100}
                  max={1200}
                  step={1}
                />
                <input
                  id='width'
                  type='number'
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  min={100}
                  max={1200}
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
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={100}
                  max={1200}
                  step={1}
                />
                <input
                  id='height'
                  type='number'
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  min={100}
                  max={1200}
                  step={1}
                />
                px
              </div>
            </div>
            <div className='control'>
              <label htmlFor='reset'>Size</label>
              <button
                id='reset'
                onClick={() => {
                  setWidth(800)
                  setHeight(400)
                }}
              >
                Reset
              </button>
              <button
                type='button'
                onClick={() => {
                  setWidth(1200)
                  setHeight(600)
                }}
              >
                2:1
              </button>
              <button
                type='button'
                onClick={() => {
                  setWidth(1200)
                  setHeight(630)
                }}
              >
                1.9:1
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
                download={result ? 'image.svg' : false}
                rel='noreferrer'
              >
                Export SVG
              </a>
              <a
                className={!result || renderType === 'html' ? 'disabled' : ''}
                href='#'
                onClick={(e) => {
                  e.preventDefault()
                  if (!result) return false
                  window.open?.('')?.document.write(result)
                }}
              >
                (View in New Tab ↗)
              </a>
            </div>
            <div className='control'>
              <label>Satori Version</label>
              <a
                href='https://github.com/vercel/satori'
                target='_blank'
                rel='noreferrer'
              >
                {packageJson.version}
              </a>
            </div>
          </div>
        </div>
      </Panel>
    </>
  )
})

function ResetCode({ activeCard }: { activeCard: string }) {
  const { onChange } = useContext(LiveContext) as unknown as {
    onChange: (val: string) => void
  }

  useEffect(() => {
    const params = new URL(String(document.location)).searchParams
    const shared = params.get('share')
    // we just need change editedCards on mounted
    if (shared) {
      try {
        const decompressedData = fflate.strFromU8(
          fflate.decompressSync(Base64.toUint8Array(shared))
        )
        let card
        let tab
        try {
          const decoded = JSON.parse(decompressedData)
          card = decoded.code
          overrideOptions = decoded.options
          tab = decoded.tab || 'helloworld'
        } catch (e) {
          card = decompressedData
        }

        editedCards[tab] = card
        onChange(editedCards[tab])
      } catch (e) {
        console.error('Failed to parse shared card:', e)
      }
    }
  }, [])

  return (
    <button
      onClick={() => {
        editedCards[activeCard] = playgroundTabs[activeCard]
        onChange(editedCards[activeCard])
        window.history.replaceState(null, '', '/')
        toast.success('Content reset')
      }}
    >
      Reset
    </button>
  )
}

export default function Playground() {
  const [activeCard, setActiveCard] = useState<string>('helloworld')
  const [showIntroduction, setShowIntroduction] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

  // set isMobileView to true if the screen is less than 600px wide
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 600)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    try {
      const hasVisited = localStorage.getItem('_vercel_og_playground_visited')
      if (hasVisited) return
    } catch (e) {
      console.error(e)
    }

    setShowIntroduction(true)
  }, [])

  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])

  const editorPanel = (
    <Panel>
      <Tabs
        options={cardNames}
        onChange={(name: string) => {
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
                        tab: activeCard,
                      })
                    )
                  ),
                  true
                )

                window.history.replaceState(null, '', '?share=' + compressed)
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
    </Panel>
  )

  const previewPanel = (
    <Panel>
      <PanelGroup direction='vertical'>
        <LiveSatori />
      </PanelGroup>
    </Panel>
  )

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
      <Toaster
        toastOptions={{
          style: {
            fontSize: 13,
            borderRadius: 6,
            padding: '2px 4px 2px 12px',
          },
        }}
      />
      <nav>
        <h1>
          <svg viewBox='0 0 75 65' fill='#000' height='12'>
            <title>Vercel</title>
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
          {hydrated ? (
            <PanelGroup
              autoSaveId='og-playground'
              direction={isMobileView ? 'vertical' : 'horizontal'}
            >
              {isMobileView ? previewPanel : editorPanel}
              <PanelResizeHandle />
              {isMobileView ? editorPanel : previewPanel}
            </PanelGroup>
          ) : null}
        </LiveProvider>
      </div>
    </>
  )
}
