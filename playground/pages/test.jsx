import { useState } from 'react'
import { useEffect } from 'react'
import satori from 'satori'

const element = (
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
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        rauchg.com
      </span>
    </div>
    <div
      style={{
        padding: '20px 40px',
        letterSpacing: -2,
        fontSize: 40,
        fontWeight: 700,
        width: 'auto',
        maxWidth: 550,
        textAlign: 'center',
        backgroundColor: 'blue',
        backgroundImage: `linear-gradient(to bottom, red, transparent)`,
        color: 'white',
        borderTopLeftRadius: 100,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 100,
        borderBottomLeftRadius: 20,
        border: '8px solid gold',
        transform:
          'rotate(-10deg) translate(0, -10px) skewX(-10deg) scale(1.2, 1.2)',
      }}
    >
      7 Principles of{' '}
      <span
        style={{
          color: 'gold',
          display: 'inline-block',
          transform: 'rotate(10deg) scale(1, 2)',
        }}
      >
        Rich
      </span>{' '}
      Web Applications
    </div>
  </div>
)

async function init() {
  if (typeof window === 'undefined') return []
  if (window.__initialized) return window.__initialized

  const [req1, req2] = await Promise.all([
    fetch(
      'https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-400-normal.woff'
    ),
    fetch(
      'https://unpkg.com/@fontsource/inter@4.5.2/files/inter-latin-ext-700-normal.woff'
    ),
  ])
  const [font, fontBold] = await Promise.all([
    req1.arrayBuffer(),
    req2.arrayBuffer(),
  ])

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
      const result = satori(element, {
        width,
        height,
        fonts,
      })

      setSvg(result)
    })()
  }, [])

  return (
    <div id='container'>
      <div id='svg' dangerouslySetInnerHTML={{ __html: svg }}></div>
      <div style={{ position: 'relative', width, height }}>{element}</div>
    </div>
  )
}
