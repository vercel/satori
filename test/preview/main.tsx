import React from 'react'
import { svg2png, initialize } from 'svg2png-wasm'

// @ts-ignore
import font from '../assets/Roboto-Regular.ttf?url'
// @ts-ignore
import fontBold from '../assets/Roboto-Bold.ttf?url'
// @ts-ignore
import svg2pngWasm from '../assets/svg2png_wasm_bg.wasm?url'

import image from './image'
import satori from '../../src'

const container = document.querySelector('#svg')
const img = document.querySelector('#preview') as HTMLImageElement

;(async () => {
  await initialize(fetch(svg2pngWasm))

  const fontData = await (await fetch(font)).arrayBuffer()
  const fontData2 = await (await fetch(fontBold)).arrayBuffer()

  const width = 400 * 2
  const height = 225 * 2

  const svg = satori(
    <div
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        fontFamily: 'Roboto',
        backgroundColor: 'white',
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
          letterSpacing: -0.05,
          fontSize: 40,
          fontWeight: 700,
          width: 'auto',
          maxWidth: 600,
          textAlign: 'center',
          background: 'black',
          color: 'white',
          borderTopLeftRadius: 200,
          borderTopRightRadius: 20,
          borderBottomRightRadius: 200,
          borderBottomLeftRadius: 20,
          border: '8px solid gold',
        }}
      >
        7 Principles of Rich Web Applications
      </div>
      <img
        src={image}
        width={128 * 0.5}
        height={128 * 0.5}
        style={{
          marginTop: 30,
          borderRadius: 128,
        }}
      />
    </div>,
    {
      width,
      height,
      fonts: [
        {
          name: 'Roboto',
          data: fontData,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Roboto',
          data: fontData2,
          weight: 700,
          style: 'normal',
        },
      ],
    }
  )

  container.innerHTML = svg

  const png = await svg2png(svg, {
    scale: 2,
    width: width * 2,
    height: height * 2,
    fonts: [new Uint8Array(fontData), new Uint8Array(fontData2)],
  })
  const blobUrl = URL.createObjectURL(new Blob([png], { type: 'image/png' }))

  img.src = blobUrl
  img.style.width = width + 'px'
})()
