/**
 * Modified version of https://unpkg.com/twemoji@13.1.0/dist/twemoji.esm.js.
 */

/*! Copyright Twitter Inc. and other contributors. Licensed under MIT */

const U200D = String.fromCharCode(8205)
const UFE0Fg = /\uFE0F/g

export function getIconCode(char: string) {
  return toCodePoint(char.indexOf(U200D) < 0 ? char.replace(UFE0Fg, '') : char)
}

function toCodePoint(unicodeSurrogates: string) {
  const r = []
  let c = 0,
    p = 0,
    i = 0

  while (i < unicodeSurrogates.length) {
    c = unicodeSurrogates.charCodeAt(i++)
    if (p) {
      r.push((65536 + ((p - 55296) << 10) + (c - 56320)).toString(16))
      p = 0
    } else if (55296 <= c && c <= 56319) {
      p = c
    } else {
      r.push(c.toString(16))
    }
  }
  return r.join('-')
}

export const apis = {
  twemoji: (code: string) =>
    'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/' +
    code.toLowerCase() +
    '.svg',
  openmoji: 'https://cdn.jsdelivr.net/npm/@svgmoji/openmoji@2.0.0/svg/',
  blobmoji: 'https://cdn.jsdelivr.net/npm/@svgmoji/blob@2.0.0/svg/',
  noto: 'https://cdn.jsdelivr.net/gh/svgmoji/svgmoji/packages/svgmoji__noto/svg/',
  fluent: (code: string) =>
    'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/' +
    code.toLowerCase() +
    '_color.svg',
  fluentFlat: (code: string) =>
    'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode/assets/' +
    code.toLowerCase() +
    '_flat.svg',
}

const emojiCache: Record<string, Promise<any>> = {}

export function loadEmoji(type: keyof typeof apis, code: string) {
  const key = type + ':' + code
  if (key in emojiCache) return emojiCache[key]

  if (!type || !apis[type]) {
    type = 'twemoji'
  }

  const api = apis[type]
  if (typeof api === 'function') {
    return (emojiCache[key] = fetch(api(code)).then((r) => r.text()))
  }
  return (emojiCache[key] = fetch(`${api}${code.toUpperCase()}.svg`).then((r) =>
    r.text()
  ))
}
