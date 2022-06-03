import Yoga from 'yoga-layout-prebuilt'
import { Resvg } from '@resvg/resvg-js'
import { toPng as png, toSvg as svg, init } from '@vercel/satori-core'

export function toPng(...opts: Parameters<typeof png>) {
    init({Yoga, Resvg})
    return png(...opts)
}

export function toSvg(...opts: Parameters<typeof svg>) {
    init({Yoga, Resvg})
    return svg(...opts)
}