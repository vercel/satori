import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'
import satori from '../src'

describe('Border', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('border-color', () => {
    it('should render black border by default', async () => {
      const svg = await satori(
        <div
          style={{ border: '1px solid', width: '50%', height: '50%' }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><clipPath id=\\"satori_bc-id\\"><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\"/></clipPath></defs><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\" fill=\\"transparent\\" stroke=\\"black\\" stroke-width=\\"2\\" clip-path=\\"url(#satori_bc-id)\\"/></svg>"'
      )
    })

    it('should fallback border color to the current color', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            color: 'red',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><clipPath id=\\"satori_bc-id\\"><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\"/></clipPath></defs><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\" fill=\\"transparent\\" stroke=\\"red\\" stroke-width=\\"2\\" clip-path=\\"url(#satori_bc-id)\\"/></svg>"'
      )
    })

    it('should support specifying borderColor', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px',
            borderColor: 'red',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><clipPath id=\\"satori_bc-id\\"><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\"/></clipPath></defs><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\" fill=\\"transparent\\" stroke=\\"red\\" stroke-width=\\"2\\" clip-path=\\"url(#satori_bc-id)\\"/></svg>"'
      )
    })

    it('should support overriding borderColor', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px blue',
            borderColor: 'red',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><clipPath id=\\"satori_bc-id\\"><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\"/></clipPath></defs><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\" fill=\\"transparent\\" stroke=\\"red\\" stroke-width=\\"2\\" clip-path=\\"url(#satori_bc-id)\\"/></svg>"'
      )
    })
  })

  describe('border-width', () => {
    it('should render border inside the shape', async () => {
      const svg = await satori(
        <div
          style={{ border: '5px solid black', width: 50, height: 50 }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><clipPath id=\\"satori_bc-id\\"><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\"/></clipPath></defs><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\" fill=\\"transparent\\" stroke=\\"black\\" stroke-width=\\"10\\" clip-path=\\"url(#satori_bc-id)\\"/></svg>"'
      )
    })
  })

  describe('border-style', () => {
    it('should support dashed border', async () => {
      const svg = await satori(
        <div
          style={{ border: '5px dashed black', width: 50, height: 50 }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"><defs><clipPath id=\\"satori_bc-id\\"><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\"/></clipPath></defs><rect x=\\"0\\" y=\\"0\\" width=\\"50\\" height=\\"50\\" fill=\\"transparent\\" stroke=\\"black\\" stroke-width=\\"10\\" stroke-dasharray=\\"10  5\\" clip-path=\\"url(#satori_bc-id)\\"/></svg>"'
      )
    })
  })
})
