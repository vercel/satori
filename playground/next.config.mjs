import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(dirname, '..'),
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    // Prepared by `scripts/bundle-webgl-libs.mjs` and loaded at runtime.
    '/api/shader-card': ['./.webgl-libs/**/*', './public/geist-700-normal.ttf'],
  },
}

export default nextConfig
