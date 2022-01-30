import React from 'react'
import { it, describe, expect } from 'vitest'
import fs from 'fs/promises'
import { join } from 'path'

import satori from '../src'

function Foo({ children }) {
  return <h2>wow, {children}</h2>
}

describe('', () => {
  it('', async () => {
    const fontPath = join(process.cwd(), 'assets', 'Roboto-Regular.ttf')
    const fontData = await fs.readFile(fontPath)

    // expect(satori(<h1></h1>, { width: 100, height: 100 })).toEqual('')

    // console.log(
    //   satori(
    //     <div>
    //       <p>hello</p>
    //       <p>world!!</p>
    //       <Foo>hey</Foo>
    //     </div>,
    //     {
    //       width: 100,
    //       height: 100,
    //       fonts: [
    //         {
    //           name: 'Roboto',
    //           data: fontData,
    //           weight: 400,
    //           style: 'normal',
    //         },
    //       ],
    //     }
    //   )
    // )
  })
})
