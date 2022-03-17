import { useState } from 'react'
import { useEffect } from 'react'
import { init as initSatori, toSvg } from 'satori/wasm'
import initYoga from 'yoga-wasm-web'
import { initWasm as initResvg } from '@resvg/resvg-wasm'

import nextConfCard from '../cards/next-conf'
import githubCard from '../cards/github'
import rauchgCard from '../cards/rauchg'
import getTwemojiMap, { loadEmoji } from '../utils/twemoji'

const card = githubCard

async function init() {
  if (typeof window === 'undefined') return []
  if (window.__initialized) return window.__initialized

  const [font, fontBold, fontIcon, yoga, resvg] = await Promise.all(
    [
      fetch(
        'https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-400-normal.woff'
      ),
      fetch(
        'https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-700-normal.woff'
      ),
      fetch(
        'https://unpkg.com/@fontsource/material-icons@4.5.2/files/material-icons-base-400-normal.woff'
      ),
    ]
      .map((f) => f.then((res) => res.arrayBuffer()))
      .concat(WebAssembly.compileStreaming(fetch('/yoga.wasm')).then(initYoga))
      .concat(WebAssembly.compileStreaming(fetch('/resvg.wasm')).then(initResvg))
  )

  initSatori({ yoga, resvg })

  return (window.__initialized = [
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
  ])
}

const waitForResource = init()

const width = 400 * 2
const height = 255 * 2

export default function Playground() {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    ;(async () => {
      const emojiCodes = getTwemojiMap('')
      const emojis = await Promise.all(
        Object.values(emojiCodes)
          .map(loadEmoji)
          .map((r) => r.then((res) => res.text()))
      )
      const graphemeImages = Object.fromEntries(
        Object.entries(emojiCodes).map(([key], index) => [
          key,
          `data:image/svg+xml;base64,` + btoa(emojis[index]),
        ])
      )

      const fonts = await waitForResource
      const result = toSvg(card, {
        width,
        height,
        fonts,
        graphemeImages,
        // embedFont: false,
        debug: true,
      })

      setSvg(result)
    })()
  }, [])

  return (
    <div id='container'>
      <div id='svg' dangerouslySetInnerHTML={{ __html: svg }}></div>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          width,
          height,
          overflow: 'hidden',
          letterSpacing: 0,
          fontSize: 16,
        }}
      >
        {card}
      </div>
    </div>
  )
}
