/**
 * Pre-defined styles for elements. Here we hand pick some from Chromium's
 * default styles:
 * https://chromium.googlesource.com/chromium/blink/+/master/Source/core/css/html.css
 *
 * We try to only include commonly used, styling elements rather than senmantic elements.
 */

export default {
  // Generic block-level elements
  p: {
    display: 'block',
    marginTop: '1em',
    marginBottom: '1em',
  },
  div: {
    display: 'block',
  },
  blockquote: {
    display: 'block',
    marginTop: '1em',
    marginBottom: '1em',
    marginLeft: 40,
    marginRight: 40,
  },
  center: {
    display: 'block',
    textAlign: 'center',
  },
  hr: {
    display: 'block',
    marginTop: '0.5em',
    marginBottom: '0.5em',
    marginLeft: 'auto',
    marginRight: 'auto',
    borderWidth: 1,
    borderStyle: 'inset',
  },
  // Heading elements
  h1: {
    display: 'block',
    fontSize: '2em',
    marginTop: '0.67em',
    marginBottom: '0.67em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h2: {
    display: 'block',
    fontSize: '1.5em',
    marginTop: '0.83em',
    marginBottom: '0.83em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h3: {
    display: 'block',
    fontSize: '1.17em',
    marginTop: '1em',
    marginBottom: '1em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h4: {
    display: 'block',
    marginTop: '1.33em',
    marginBottom: '1.33em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h5: {
    display: 'block',
    fontSize: '0.83em',
    marginTop: '1.67em',
    marginBottom: '1.67em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h6: {
    display: 'block',
    fontSize: '0.67em',
    marginTop: '2.33em',
    marginBottom: '2.33em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  // Tables
  // Lists
  // Form elements
  // Inline elements
  u: {
    textDecoration: 'underline',
  },
  strong: {
    fontWeight: 'bold',
  },
  b: {
    fontWeight: 'bold',
  },
  i: {
    fontStyle: 'italic',
  },
  em: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'monospace',
  },
  kbd: {
    fontFamily: 'monospace',
  },
  pre: {
    display: 'block',
    fontFamily: 'monospace',
    whiteSpace: 'pre',
    marginTop: '1em',
    marginBottom: '1em',
  },
  mark: {
    backgroundColor: 'yellow',
    color: 'black',
  },
  big: {
    fontSize: 'larger',
  },
  small: {
    fontSize: 'smaller',
  },
  s: {
    textDecoration: 'line-through',
  },
}
