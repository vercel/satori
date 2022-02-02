import {
  SandpackCodeEditor,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
} from '@codesandbox/sandpack-react'

const files = {
  '/style.css': `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700');

* {
  box-sizing: border-box;
}

body {
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
  Helvetica Neue, Arial, Noto Sans, sans-serif, Apple Color Emoji,
  Segoe UI Emoji, Segoe UI Symbol, Noto Color Emoji;
  -webkit-font-smoothing: antialiased;
  font-variant: common-ligatures contextual;
  letter-spacing: -0.015em;
  margin: 0;
  padding: 20px;
  max-width: 100%;
  line-height: 1.5;
  box-sizing: border-box;
}
code, button {
  font-size: 14px;
  font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
}
main {
  margin: 10px 0;
}
.svg {
  display: flex;
}
svg, img {
  border: 1px solid;
  width: 100%;
  max-width: 100%;
  height: auto;
}
button {
  padding: 5px 20px;
  appearance: none;
  border: none;
  border-radius: 3px;
  background: #efefef;
}
button:hover {
  background: #e1e1e1;
}
button + button {
  margin-left: 10px;
}
button.active {
  color: white;
  background: #2196f3;
}
a {
  color: black;
}
`,
  '/App.js': `
import React, { useEffect, useState, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import satori from 'satori'

import './style.css'
import Card from './card'

globalThis.React = React
globalThis.__fonts

async function init() {
  if (typeof window === 'undefined') return
  if (globalThis.__fonts) return

  const [req1, req2] = await Promise.all([
    fetch('https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-400-normal.woff'),
    fetch('https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-700-normal.woff'),
  ])
  const [font, fontBold] = await Promise.all([
    req1.arrayBuffer(),
    req2.arrayBuffer(),
  ])

  globalThis.__fonts = [
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
  ]
}

const promise = init()

let width = 400 * 2
let height = 255 * 2

ReactDOM.render(<App />, document.getElementById('root'))

export default function App() {
  const [svg, setSvg] = useState('')
  const [time, setTime] = useState(0)
  const rerender = useState({})[1]

  useEffect(() => {
    promise.then(() => { rerender({}) })

    const onResize = () => {
      width = window.innerWidth - 40
      height = ~~(width * 0.6375)
      rerender({})
    }
    window.addEventListener('resize', onResize)
    onResize()

    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const [tab, setTab] = useState('svg')

  const withSatori = element => {
    if (!globalThis.__fonts) return element

    useEffect(() => {
      try {
        const t = Date.now()
        const result = satori(element, {
          width,
          height,
          fonts: globalThis.__fonts
        })
        setTime(Date.now() - t)
        setSvg(result)
      } catch (err) {
        console.error(err)
      }
    }, [])

    return element
  }

  return <div>
    <div>
      <button onClick={() => setTab('svg')} className={tab === 'svg' ? 'active' : ''}>SVG (Rendered via Satori)</button>
      <button onClick={() => setTab('html')} className={tab === 'html' ? 'active' : ''}>HTML (Native)</button>
    </div>
    <main>
      {svg && tab === 'svg' ? <div className="svg" dangerouslySetInnerHTML={{ __html: svg }}></div> : null}
      <div style={{
        width,
        height,
        overflow: 'hidden',
        clear: 'both',
        display: tab === 'html' ? 'block' : 'none',
        position: 'relative',
        border: '1px solid'
      }}>
        <Card withSatori={withSatori} />
      </div> 
    </main>
    <code>Canvas size: {width}×{~~height}. SVG generated in {time}ms.</code>
    <p>
      <code>Satori project: <a href="https://github.com/vercel/satori" target="_blank">github.com/vercel/satori</a></code>
    </p>
  </div>
}
`,
  '/card.js': {
    code: `export default function Card({ withSatori }) {
  return withSatori(
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'Inter',
        backgroundImage: 'linear-gradient(to bottom, white, #ddd)',
      }}
    >
      <div
        style={{
          padding: '20px 40px',
          letterSpacing: -1,
          fontSize: 44,
          fontWeight: 700,
          maxWidth: '75%',
          width: '100%',
          textAlign: 'center',
          backgroundColor: '#666',
          backgroundImage: 'linear-gradient(to top, black, transparent)',
          color: 'white',
          borderTopLeftRadius: 100,
          borderTopRightRadius: 20,
          borderBottomRightRadius: 100,
          borderBottomLeftRadius: 20,
          border: '8px solid gold',
          transform:
            'rotate(-10deg) translate(0, 10px) skewX(-10deg)',
        }}
      >
        Making the Web.
        <span
          style={{
            display: 'block',
            color: 'gold',
            transform: 'rotate(10deg) scale(2, 1.3)',
          }}
        >
          Faster.
        </span>
      </div>
      <div
        style={{
          left: 42,
          top: 42,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            background: 'black',
          }}
        />
        <span
          style={{
            marginLeft: 8,
            letterSpacing: -0.2,
            fontSize: 15,
            fontWeight: 700,
          }}
        >
          rauchg.com
        </span>
      </div>
    </div>
  )
}`,
    active: true,
  },
}

export default function Playground() {
  return (
    <div>
      <SandpackProvider
        recompileMode='immediate'
        customSetup={{
          files,
          entry: '/App.js',
          main: '/card.js',
          dependencies: {
            react: '17.0.2',
            'react-dom': '17.0.2',
            satori: '0.0.6',
          },
        }}
      >
        <SandpackLayout
          theme={{
            typography: {
              fontSize: '14px',
              monoFont:
                "ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace",
            },
          }}
        >
          <SandpackCodeEditor
            showTabs={false}
            wrapContent
            showLineNumbers
            showInlineErrors
            initMode='immediate'
            customStyle={{
              height: '100vh',
            }}
          />
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            viewportSize='auto'
            customStyle={{
              height: '100vh',
            }}
          />
        </SandpackLayout>
      </SandpackProvider>
    </div>
  )
}
