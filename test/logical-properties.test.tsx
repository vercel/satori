import { it, describe, expect } from 'vitest'

import { initFonts } from './utils.js'
import satori from '../src/index.js'

describe('Logical properties', () => {
  let fonts
  initFonts((f) => (fonts = f))

  const box = { width: 20, height: 10, backgroundColor: 'red' }
  const expectSame = async (actual: JSX.Element, expected: JSX.Element) => {
    const options = { width: 100, height: 100, fonts }
    expect(await satori(actual, options)).toBe(await satori(expected, options))
  }
  const container = (child: JSX.Element, style = {}) => (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {child}
    </div>
  )

  it('should convert logical properties to physical ones', async () => {
    await expectSame(
      container(
        <div
          style={{
            ...box,
            position: 'relative',
            marginInline: '4px 8px',
            marginBlockStart: 6,
            paddingInline: 2,
            paddingBlock: '1px 3px',
            insetInlineStart: 5,
            inlineSize: 30,
            blockSize: 12,
            maxInlineSize: 25,
            borderInlineStart: '2px solid blue',
            borderBlockEndWidth: 3,
            borderBlockEndStyle: 'solid',
            borderStartEndRadius: 4,
          }}
        />
      ),
      container(
        <div
          style={{
            ...box,
            position: 'relative',
            marginLeft: 4,
            marginRight: 8,
            marginTop: 6,
            paddingLeft: 2,
            paddingRight: 2,
            paddingTop: 1,
            paddingBottom: 3,
            left: 5,
            width: 30,
            height: 12,
            maxWidth: 25,
            borderLeft: '2px solid blue',
            borderBottomWidth: 3,
            borderBottomStyle: 'solid',
            borderTopRightRadius: 4,
          }}
        />
      )
    )
  })

  it('should use the direction of elements', async () => {
    const logical = {
      ...box,
      marginInlineStart: 4,
      paddingInlineEnd: 6,
      borderStartStartRadius: 5,
    }
    const physical = {
      ...box,
      marginRight: 4,
      paddingLeft: 6,
      borderTopRightRadius: 5,
    }
    await expectSame(
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div dir='rtl' style={logical} />
        <div style={{ ...logical, direction: 'rtl' }} />
        <div dir='rtl' style={{ display: 'flex' }}>
          <div style={logical} />
        </div>
      </div>,
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div dir='rtl' style={physical} />
        <div style={{ ...physical, direction: 'rtl' }} />
        <div dir='rtl' style={{ display: 'flex' }}>
          <div style={physical} />
        </div>
      </div>
    )
  })

  it('should apply logical and physical properties in order', async () => {
    await expectSame(
      container(
        <>
          <div style={{ ...box, paddingLeft: 4, paddingInline: 8 }} />
          <div style={{ ...box, paddingInline: 8, paddingLeft: 4 }} />
          <div
            style={{ ...box, paddingLeft: 4, padding: 0, paddingInline: 8 }}
          />
        </>
      ),
      container(
        <>
          <div style={{ ...box, paddingLeft: 8, paddingRight: 8 }} />
          <div style={{ ...box, paddingLeft: 4, paddingRight: 8 }} />
          <div style={{ ...box, paddingLeft: 8, paddingRight: 8 }} />
        </>
      )
    )
  })

  it('should support logical properties in stylesheets', async () => {
    // Like `mx-auto` and `px-4` of Tailwind CSS v4.
    await expectSame(
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <style>
          {`.mx-auto { margin-inline: auto } .px-4 { padding-inline: 4px }`}
        </style>
        <div className='mx-auto px-4' style={box} />
      </div>,
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {/* The same children, for the same IDs of masks. */}
        <style />
        <div
          style={{
            ...box,
            marginLeft: 'auto',
            marginRight: 'auto',
            paddingLeft: 4,
            paddingRight: 4,
          }}
        />
      </div>
    )
  })
})
