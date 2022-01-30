import React from 'react'
import { svg2png, initialize } from 'svg2png-wasm'

// @ts-ignore
import font from '../assets/Roboto-Regular.ttf?url'
// @ts-ignore
import fontBold from '../assets/Roboto-Bold.ttf?url'
// @ts-ignore
import svg2pngWasm from '../assets/svg2png_wasm_bg.wasm?url'

import satori from '../../src'

const container = document.querySelector('#svg')
const img = document.querySelector('#preview') as HTMLImageElement

;(async () => {
  await initialize(fetch(svg2pngWasm))

  const fontData = await (await fetch(font)).arrayBuffer()
  const fontData2 = await (await fetch(fontBold)).arrayBuffer()

  const width = 200
  const height = 400

  const svg = satori(
    <div style={{ fontFamily: 'Roboto' }}>
      <p>
        test <b>hi</b>
        <b style={{ color: 'red' }}>hi</b>
      </p>
      <div>
        Lorem, ipsum dolor sit amet consectetur adipisicing elit. Aliquid quis
        voluptate dolore, quaerat pariatur soluta vel, sint tempora quibusdam
        obcaecati, quas sunt unde! Hic numquam magni nihil tenetur corporis
        consectetur.
      </div>
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
  img.style.height = height + 'px'
})()
