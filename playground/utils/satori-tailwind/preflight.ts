import { type CSSProperties } from 'react'

/**
 * Much simplified version of https://unpkg.com/tailwindcss@3.0.23/src/css/preflight.css
 */
const map: Record<string, CSSProperties> = {
  hr: {
    height: 0,
    color: 'inherit',
    borderTopWidth: 1,
  },
  h1: {
    fontSize: 'inherit',
    fontWeight: 'inherit',
    margin: 0,
  },
  h2: {
    fontSize: 'inherit',
    fontWeight: 'inherit',
    margin: 0,
  },
  h3: {
    fontSize: 'inherit',
    fontWeight: 'inherit',
    margin: 0,
  },
  h4: {
    fontSize: 'inherit',
    fontWeight: 'inherit',
    margin: 0,
  },
  h5: {
    fontSize: 'inherit',
    fontWeight: 'inherit',
    margin: 0,
  },
  h6: {
    fontSize: 'inherit',
    fontWeight: 'inherit',
    margin: 0,
  },
  a: {
    color: 'inherit',
  },
  small: {
    fontSize: '80%',
  },
  sub: {
    fontSize: '75%',
    position: 'relative',
    bottom: '-0.25em',
  },
  sup: {
    fontSize: '75%',
    position: 'relative',
    top: '-0.5em',
  },
  blockquote: { margin: 0 },
  dl: { margin: 0 },
  dd: { margin: 0 },
  figure: { margin: 0 },
  p: { margin: 0 },
  pre: { margin: 0 },
  fieldset: { margin: 0, padding: 0 },
  legend: { padding: 0 },
  ol: { margin: 0, padding: 0 },
  ul: { margin: 0, padding: 0 },
  menu: { margin: 0, padding: 0 },
  img: { display: 'block', maxWidth: '100%', height: 'auto' },
}

export default function preflight() {
  return (s?: string) => map[s || ''] || {}
}
