import { useState } from 'react'
import { useEffect } from 'react'
import { toPng, toSvg, init as initSatori } from '@vercel/satori-core'

import nextConfCard from '../cards/next-conf'
import githubCard from '../cards/github'
import rauchgCard from '../cards/rauchg'
import { loadAdditionalAsset} from '../utils/load-asset'

const card = githubCard

async function init() {
  if (typeof window === 'undefined') return []
  if (window.__initialized) return window.__initialized

  
  const [font, fontBold, fontIcon, Yoga, Resvg] = await Promise.all(
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
      .concat(WebAssembly.compileStreaming(fetch('/yoga.wasm')))
      .concat(WebAssembly.compileStreaming(fetch('/resvg.wasm')))
  )

  initSatori({ Yoga, Resvg })

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

      const fonts = await waitForResource
      const result = await toSvg(card, {
        width,
        height,
        fonts,
        loadAdditionalAsset,
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
