export default async function loadGoogleFont(req) {
  if (req.nextUrl.pathname !== '/api/font') return
  const { searchParams } = new URL(req.url)

  const font = searchParams.get('font')
  const text = searchParams.get('text')

  if (!font || !text) return

  const css = await (
    await fetch(`https://fonts.googleapis.com/css2?family=${font}&text=${text}`)
  ).text()

  const resource = css.match(/src: url\((.+)\) format\('(opentype|truetype)'\)/)
  if (!resource) return

  return fetch(resource[1])
}
