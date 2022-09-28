import React from 'react'
import { it, describe, expect } from 'vitest'

import { initFonts, toImage } from './utils'
import satori from '../src'

describe('Border', () => {
  let fonts
  initFonts((f) => (fonts = f))

  describe('border-radius', () => {
    it('should support the shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            borderRadius: '10px',
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support radius for a certain corner', async () => {
      const svg = await satori(
        <div
          style={{
            borderTopRightRadius: '50px',
            borderTopLeftRadius: '10px',
            borderBottomLeftRadius: '60px',
            background: 'red',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border', () => {
    it('should support the shorthand', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px solid',
            width: '100%',
            height: '100%',
          }}
        ></div>,
        {
          width: 100,
          height: 100,
          fonts,
        }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })

  describe('border-color', () => {
    it('should render black border by default', async () => {
      const svg = await satori(
        <div
          style={{ border: '1px solid', width: '50%', height: '50%' }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })

    it('should support specifying `borderColor`', async () => {
      const svg = await satori(
        <div
          style={{
            border: '1px',
            borderColor: 'green',
            width: '50%',
            height: '50%',
          }}
        ></div>,
        { width: 100, height: 100, fonts }
      )
      expect(toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(toImage(svg, 100)).toMatchImageSnapshot()
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
      expect(toImage(svg, 100)).toMatchImageSnapshot()
    })
  })
})
