import { useState } from 'react'
import { useEffect } from 'react'
import satori from 'satori'

import transformOrigin from '../cards/transform-origin'
import nextConfCard from '../cards/next-conf'
import githubCard from '../cards/github'
import textAlignCard from '../cards/text-align'
import rauchgCard from '../cards/rauchg'
import overflowCard from '../cards/overflow'
import vercelCard from '../cards/vercel'
import dpsCard from '../cards/dps'
import whiteSpaceCard from '../cards/white-space'
import getTwemojiMap, { loadEmoji } from '../utils/twemoji'

const card = nextConfCard

async function init() {
  if (typeof window === 'undefined') return []
  if (window.__initialized) return window.__initialized

  const [font, fontBold, fontIcon] = await Promise.all(
    (
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
    ).map((res) => res.arrayBuffer())
  )

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

      const result = satori(card, {
        width,
        height,
        fonts,
        graphemeImages,
        // embedFont: false,
        // debug: true,
      })

      setSvg(result)
    })()
  }, [])

  return (
    <div id='container' style={{ padding: 10 }}>
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
          border: '1px solid black',
        }}
      >
        {card}
      </div>
    </div>
  )
}
