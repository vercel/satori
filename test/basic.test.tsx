import React from 'react'
import { it, describe, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs/promises'
import { join } from 'path'

import satori from '../src'

function Foo({ children }) {
  return <h2>wow, {children}</h2>
}

describe('', () => {
  it('', async () => {
    const fontPath = join(process.cwd(), 'test', 'assets', 'Roboto-Regular.ttf')
    const fontData = await fs.readFile(fontPath)

    // expect(satori(<h1></h1>, { width: 100, height: 100 })).toEqual('')

    console.log(
      satori(
        <div>
          <p>hello</p>
          <div>
            <p>world!!</p>
            <Foo>hey</Foo>
          </div>
        </div>,
        {
          width: 100,
          height: 100,
          fonts: [
            {
              name: 'Roboto',
              data: fontData,
              weight: 400,
              style: 'normal',
            },
          ],
        }
      )
    )
  })
})
