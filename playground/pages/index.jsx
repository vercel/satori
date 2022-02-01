import { useState } from 'react'
import { useEffect } from 'react'
import satori from 'satori'
import { svg2png, initialize } from 'svg2png-wasm'

async function init() {
  if (typeof window === 'undefined') return []
  if (window.__initialized) return window.__initialized

  const [_, req1, req2] = await Promise.all([
    initialize(fetch('/svg2png_wasm_bg.wasm')),
    fetch('/Roboto-Regular.ttf'),
    fetch('/Roboto-Bold.ttf'),
  ])
  const [font, fontBold] = await Promise.all([
    req1.arrayBuffer(),
    req2.arrayBuffer(),
  ])

  return (window.__initialized = [
    {
      name: 'Roboto',
      data: font,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Roboto',
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
  const [img, setImg] = useState('')

  useEffect(() => {
    ;(async () => {
      const fonts = await waitForResource
      const result = satori(
        <div
          style={{
            display: 'flex',
            height: '100%',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            fontFamily: 'Roboto',
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
              backgroundColor: 'red',
              backgroundImage: `linear-gradient(to bottom, red, transparent), linear-gradient(to right, green, transparent)`,
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
                color: 'red',
                transform: 'rotate(45deg) scale(1.8, 1.8)',
              }}
            >
              Rich
            </span>{' '}
            Web Applications
          </div>
        </div>,
        {
          width,
          height,
          fonts,
        }
      )

      setSvg(result)

      const png = await svg2png(result, {
        scale: 2,
        width: width * 2,
        height: height * 2,
        fonts: fonts.map((f) => new Uint8Array(f.data)),
      })
      const blobUrl = URL.createObjectURL(
        new Blob([png], { type: 'image/png' })
      )
      setImg(blobUrl)
    })()
  }, [])

  return (
    <div id='container'>
      <div id='svg' dangerouslySetInnerHTML={{ __html: svg }}></div>
      {img ? (
        <img id='preview' src={img} width={width} height={height} />
      ) : null}
    </div>
  )
}
