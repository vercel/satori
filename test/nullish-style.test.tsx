import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('Nullish style values', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const twProps = { tw: 'flex text-xl' }
  const options = () => ({ width: 100, height: 100, fonts })

  for (const [label, empty] of [
    ['undefined', undefined],
    ['null', null],
  ] as const) {
    it(`should ignore ${label} style values`, async () => {
      const withValues = await satori(
        <div
          style={{
            display: 'flex',
            fontSize: empty,
            width: empty,
            borderTop: empty,
          }}
        >
          hi
        </div>,
        options()
      )
      const omitted = await satori(
        <div style={{ display: 'flex' }}>hi</div>,
        options()
      )
      expect(withValues).toBe(omitted)
    })
  }

  it('should keep Tailwind styles when the style prop sets them to undefined', async () => {
    const withUndefined = await satori(
      <div {...twProps} style={{ fontSize: undefined }}>
        hi
      </div>,
      options()
    )
    const twOnly = await satori(<div {...twProps}>hi</div>, options())
    expect(withUndefined).toBe(twOnly)
  })
})
