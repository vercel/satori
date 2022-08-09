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
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"/>"'
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
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"/>"'
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
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"/>"'
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
        '"<svg width=\\"100\\" height=\\"100\\" viewBox=\\"0 0 100 100\\" xmlns=\\"http://www.w3.org/2000/svg\\"/>"'
      )
    })
  })
})
