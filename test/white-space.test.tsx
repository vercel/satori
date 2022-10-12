import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

describe('white-space', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('normal', () => {
    it('should not render extra spaces with `white-space: normal`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'normal',
          }}
        >
          {' hello '}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )

      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should not render extra line breaks with `white-space: normal`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'normal',
          }}
        >
          {' hello \n world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should wrap automatically with `white-space: normal`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'normal',
          }}
        >
          hello, world
        </div>,
        {
          width: 20,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 20)).toMatchImageSnapshot()
    })
  })

  describe('pre', () => {
    it('should always preserve extra spaces with `white-space: pre`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'pre',
          }}
        >
          {'     hello '}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should always preserve extra line breaks with `white-space: pre`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'pre',
          }}
        >
          {' hello \n world '}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
          embedFont: false,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should not wrap with `white-space: pre`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'pre',
          }}
        >
          hello, world
        </div>,
        {
          width: 20,
          height: 100,
          fonts,
          embedFont: false,
        }
      )
      expect(toImage(svg, 20)).toMatchImageSnapshot()
    })
  })

  describe('with `white-space: pre-wrap`', () => {
    it('should always preserve extra spaces with `white-space: pre-wrap`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          {' hello '}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should always preserve extra line breaks with `white-space: pre-wrap`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          {' hello \n world'}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
          embedFont: false,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should automatically wrap with `white-space: pre-wrap`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'pre-wrap',
          }}
        >
          hello, world
        </div>,
        {
          width: 20,
          height: 100,
          fonts,
          embedFont: false,
        }
      )
      expect(toImage(svg, 20)).toMatchImageSnapshot()
    })
  })

  describe('with `white-space: nowrap`', () => {
    it('should not wrap with `white-space: nowrap` and swallow extra spaces', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'nowrap',
          }}
        >
          {` hello, world `}
        </div>,
        {
          width: 20,
          height: 100,
          fonts,
          embedFont: false,
        }
      )
      expect(toImage(svg, 20)).toMatchImageSnapshot()
    })
  })

  describe('with `\\n` in content', () => {
    it('should render `\\n` as a whitespace', async () => {
      const svg = await satori(<div style={{}}>{`hello\nworld`}</div>, {
        width: 100,
        height: 100,
        fonts,
      })
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should render `\\n` as a line break with `pre`', async () => {
      const svg = await satori(
        <div
          style={{
            whiteSpace: 'pre',
          }}
        >
          {`hello\nworld`}
        </div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
