import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'

import { toSvg as toSvgNode } from '@vercel/satori-node'
import { toSvg as toSvgWasm } from '@vercel/satori-wasm'

describe('transform', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe.each([
    ['@vercel/satori-node', toSvgNode],
    ['@vercel/satori-wasm', toSvgWasm],
  ])('Test Package %s', (pkgName, toSvg) => {
    describe('translate', () => {
      it('should translate shape', async () => {
        const svg = await toSvg(
          <div
            style={{
              width: 10,
              height: 10,
              backgroundColor: 'red',
              transform: 'translate(10px,20px)',
            }}
          />,
          {
            width: 200,
            height: 200,
            fonts,
          }
        )
        expect(svg).toMatchInlineSnapshot(
          '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"10\\" height=\\"10\\" fill=\\"red\\" transform=\\"matrix(1.00,0.00,0.00,1.00,10.00,20.00)\\"/></svg>"'
        )
      })

      it('should translate shape in x-axis', async () => {
        const svg = await toSvg(
          <div
            style={{
              width: 10,
              height: 10,
              backgroundColor: 'red',
              transform: 'translateX(10px)',
            }}
          />,
          {
            width: 200,
            height: 200,
            fonts,
          }
        )
        expect(svg).toMatchInlineSnapshot(
          '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"10\\" height=\\"10\\" fill=\\"red\\" transform=\\"matrix(1.00,0.00,0.00,1.00,10.00,0.00)\\"/></svg>"'
        )
      })

      it('should translate shape in y-axis', async () => {
        const svg = await toSvg(
          <div
            style={{
              width: 10,
              height: 10,
              backgroundColor: 'red',
              transform: 'translateY(10px)',
            }}
          />,
          {
            width: 200,
            height: 200,
            fonts,
          }
        )
        expect(svg).toMatchInlineSnapshot(
          '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"10\\" height=\\"10\\" fill=\\"red\\" transform=\\"matrix(1.00,0.00,0.00,1.00,0.00,10.00)\\"/></svg>"'
        )
      })
    })

    describe('rotate', () => {
      it('should rotate shape', async () => {
        const svg = await toSvg(
          <div
            style={{
              width: 10,
              height: 10,
              backgroundColor: 'red',
              transform: 'rotate(30deg)',
            }}
          />,
          {
            width: 200,
            height: 200,
            fonts,
          }
        )
        expect(svg).toMatchInlineSnapshot(
          '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"10\\" height=\\"10\\" fill=\\"red\\" transform=\\"matrix(0.87,0.50,-0.50,0.87,3.17,-1.83)\\"/></svg>"'
        )
      })
    })

    describe('scale', () => {
      it('should scale shape', async () => {
        const svg = await toSvg(
          <div
            style={{
              width: 10,
              height: 10,
              backgroundColor: 'red',
              transform: 'scale(1.5)',
            }}
          />,
          {
            width: 200,
            height: 200,
            fonts,
          }
        )
        expect(svg).toMatchInlineSnapshot(
          '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"10\\" height=\\"10\\" fill=\\"red\\" transform=\\"matrix(1.50,0.00,0.00,1.50,-2.50,-2.50)\\"/></svg>"'
        )
      })

      it('should scale shape in two directions', async () => {
        const svg = await toSvg(
          <div
            style={{
              width: 10,
              height: 10,
              backgroundColor: 'red',
              transform: 'scale(2, 3)',
            }}
          />,
          {
            width: 200,
            height: 200,
            fonts,
          }
        )
        expect(svg).toMatchInlineSnapshot(
          '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><rect x=\\"0\\" y=\\"0\\" width=\\"10\\" height=\\"10\\" fill=\\"red\\" transform=\\"matrix(2.00,0.00,0.00,3.00,-5.00,-10.00)\\"/></svg>"'
        )
      })
    })
  })
})
