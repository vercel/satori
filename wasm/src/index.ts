import initYoga from 'yoga-wasm-web'
import * as resvg from '@resvg/resvg-wasm'
import { promises as fs } from 'fs'
import { join } from 'path'
import { toPng as png, toSvg as svg, init } from '@vercel/satori-core'

const assets = Promise.all([
    fs.readFile(join(__dirname, 'yoga.wasm')).then(WebAssembly.compile).then(initYoga),
    fs.readFile(join(__dirname, 'resvg.wasm')).then(WebAssembly.compile).then(async mod => {
        await resvg.initWasm(mod)
        return resvg.Resvg
    })
])

export async function toPng(...opts: Parameters<typeof png>) {
    const [Yoga, Resvg] = await assets
    init({Yoga, Resvg})
    const result = await png(...opts)
    return result
}

export async function toSvg(...opts: Parameters<typeof svg>) {
    const [Yoga, Resvg] = await assets
    init({Yoga, Resvg})
    const result = svg(...opts)
    return result
}