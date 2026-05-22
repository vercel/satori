/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [{ source: '/emoji', destination: '/api/emoji' }]
  },
  // Don't let Next/webpack/turbopack rewrap these into the function bundle.
  // They contain native bindings or WASM that need to be loaded by Node's
  // own resolver, not webpack's runtime. Without this, `satori/video`'s
  // internal sharp + h264-mp4-encoder calls hang silently on Vercel.
  serverExternalPackages: [
    'satori',
    'sharp',
    'h264-mp4-encoder',
    'yoga-layout',
  ],
}

module.exports = nextConfig
