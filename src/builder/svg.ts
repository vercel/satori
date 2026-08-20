import { buildXMLString } from '../utils.js'

export default function svg({
  width,
  height,
  content,
}: {
  width: number
  height: number
  content: string
}) {
  return buildXMLString(
    'svg',
    {
      width,
      height,
      viewBox: `0 0 ${width} ${height}`,
      xmlns: 'http://www.w3.org/2000/svg',
      'enable-background': content.includes('in="BackgroundImage"')
        ? 'new'
        : undefined,
    },
    content
  )
}
