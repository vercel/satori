import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts } from './utils'
import satori from '../src'

describe('white-space', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('normal', () => {
    it('should not render extra spaces with `white-space: normal`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'normal',
          }}
        >
          {' hello '}
        </div>,
        {
          width: 200,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"34.1796875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello</text></svg>"'
      )
    })

    it('should not render extra line breaks with `white-space: normal`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'normal',
          }}
        >
          {' hello \n world'}
        </div>,
        {
          width: 200,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"34.1796875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello</text><text x=\\"38.140625\\" y=\\"14.84375\\" width=\\"39.46875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">world</text></svg>"'
      )
    })

    it('should wrap automatically with `white-space: normal`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'normal',
          }}
        >
          hello, world
        </div>,
        {
          width: 20,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"20\\" height=\\"200\\" viewBox=\\"0 0 20 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"37.3203125\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello,</text><text x=\\"0\\" y=\\"33.59375\\" width=\\"39.46875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">world</text></svg>"'
      )
    })
  })

  describe('pre', () => {
    it('should always preserve extra spaces with `white-space: pre`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'pre',
          }}
        >
          {' hello '}
        </div>,
        {
          width: 200,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"3.9609375\\" y=\\"14.84375\\" width=\\"34.1796875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello</text><text x=\\"38.140625\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text></svg>"'
      )
    })

    it('should always preserve extra line breaks with `white-space: pre`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'pre',
          }}
        >
          {' hello \n world'}
        </div>,
        {
          width: 200,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        `
        "<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"3.9609375\\" y=\\"14.84375\\" width=\\"34.1796875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello</text><text x=\\"38.140625\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"0\\" y=\\"33.59375\\" width=\\"0\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">
        </text><text x=\\"0\\" y=\\"33.59375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"3.9609375\\" y=\\"33.59375\\" width=\\"39.46875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">world</text></svg>"
      `
      )
    })

    it('should not wrap with `white-space: pre`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'pre',
          }}
        >
          hello, world
        </div>,
        {
          width: 20,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"20\\" height=\\"200\\" viewBox=\\"0 0 20 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"37.3203125\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello,</text><text x=\\"37.3203125\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"41.28125\\" y=\\"14.84375\\" width=\\"39.46875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">world</text></svg>"'
      )
    })
  })

  describe('with `white-space: pre-wrap`', () => {
    it('should always preserve extra spaces with `white-space: pre-wrap`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          {' hello '}
        </div>,
        {
          width: 200,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"3.9609375\\" y=\\"14.84375\\" width=\\"34.1796875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello</text><text x=\\"38.140625\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text></svg>"'
      )
    })

    it('should always preserve extra line breaks with `white-space: pre-wrap`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          {' hello \n world'}
        </div>,
        {
          width: 200,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        `
        "<svg width=\\"200\\" height=\\"200\\" viewBox=\\"0 0 200 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"3.9609375\\" y=\\"14.84375\\" width=\\"34.1796875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello</text><text x=\\"38.140625\\" y=\\"14.84375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"0\\" y=\\"33.59375\\" width=\\"0\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">
        </text><text x=\\"0\\" y=\\"33.59375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"3.9609375\\" y=\\"33.59375\\" width=\\"39.46875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">world</text></svg>"
      `
      )
    })

    it('should automatically wrap with `white-space: pre-wrap`', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          hello, world
        </div>,
        {
          width: 20,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"20\\" height=\\"200\\" viewBox=\\"0 0 20 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"37.3203125\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello,</text><text x=\\"0\\" y=\\"33.59375\\" width=\\"3.9609375\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\"> </text><text x=\\"0\\" y=\\"52.34375\\" width=\\"39.46875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">world</text></svg>"'
      )
    })
  })

  describe('with `white-space: nowrap`', () => {
    it('should not wrap with `white-space: nowrap` and swallow extra spaces', async () => {
      const svg = satori(
        <div
          style={{
            whiteSpace: 'nowrap',
          }}
        >
          {` hello, world `}
        </div>,
        {
          width: 20,
          height: 200,
          fonts,
          embedFont: false,
        }
      )
      expect(svg).toMatchInlineSnapshot(
        '"<svg width=\\"20\\" height=\\"200\\" viewBox=\\"0 0 20 200\\" xmlns=\\"http://www.w3.org/2000/svg\\"><text x=\\"0\\" y=\\"14.84375\\" width=\\"37.3203125\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">hello,</text><text x=\\"41.28125\\" y=\\"14.84375\\" width=\\"39.46875\\" height=\\"18.75\\" font-weight=\\"normal\\" font-style=\\"normal\\" font-size=\\"16\\" font-family=\\"serif\\" fill=\\"black\\">world</text></svg>"'
      )
    })
  })
})
