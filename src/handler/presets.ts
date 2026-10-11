/**
 * Pre-defined styles for elements. Here we hand pick some from Chromium's
 * default styles:
 * https://chromium.googlesource.com/chromium/blink/+/master/Source/core/css/html.css
 *
 * Elements are inline by default, the initial value of `display`.
 */

const DEFAULT_DISPLAY = 'block'

const block = { display: DEFAULT_DISPLAY }

export default {
  // Generic block-level elements
  address: block,
  article: block,
  aside: block,
  details: block,
  dialog: block,
  figcaption: block,
  footer: block,
  form: block,
  header: block,
  hgroup: block,
  main: block,
  nav: block,
  search: block,
  section: block,
  summary: block,
  figure: {
    display: DEFAULT_DISPLAY,
    marginTop: '1em',
    marginBottom: '1em',
    marginLeft: 40,
    marginRight: 40,
  },
  p: {
    display: DEFAULT_DISPLAY,
    marginTop: '1em',
    marginBottom: '1em',
  },
  div: {
    display: DEFAULT_DISPLAY,
  },
  blockquote: {
    display: DEFAULT_DISPLAY,
    marginTop: '1em',
    marginBottom: '1em',
    marginLeft: 40,
    marginRight: 40,
  },
  center: {
    display: DEFAULT_DISPLAY,
    textAlign: 'center',
  },
  hr: {
    display: DEFAULT_DISPLAY,
    color: 'gray',
    marginTop: '0.5em',
    marginBottom: '0.5em',
    marginLeft: 'auto',
    marginRight: 'auto',
    borderWidth: 1,
    borderStyle: 'inset',
    overflow: 'hidden',
  },
  // Heading elements
  h1: {
    display: DEFAULT_DISPLAY,
    fontSize: '2em',
    marginTop: '0.67em',
    marginBottom: '0.67em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h2: {
    display: DEFAULT_DISPLAY,
    fontSize: '1.5em',
    marginTop: '0.83em',
    marginBottom: '0.83em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h3: {
    display: DEFAULT_DISPLAY,
    fontSize: '1.17em',
    marginTop: '1em',
    marginBottom: '1em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h4: {
    display: DEFAULT_DISPLAY,
    marginTop: '1.33em',
    marginBottom: '1.33em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h5: {
    display: DEFAULT_DISPLAY,
    fontSize: '0.83em',
    marginTop: '1.67em',
    marginBottom: '1.67em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  h6: {
    display: DEFAULT_DISPLAY,
    fontSize: '0.67em',
    marginTop: '2.33em',
    marginBottom: '2.33em',
    marginLeft: 0,
    marginRight: 0,
    fontWeight: 'bold',
  },
  // Tables
  // Lists, see `getListPresets()` for their list styles
  ul: {
    display: DEFAULT_DISPLAY,
    marginTop: '1em',
    marginBottom: '1em',
    paddingLeft: 40,
  },
  ol: {
    display: DEFAULT_DISPLAY,
    marginTop: '1em',
    marginBottom: '1em',
    paddingLeft: 40,
  },
  menu: {
    display: DEFAULT_DISPLAY,
    marginTop: '1em',
    marginBottom: '1em',
    paddingLeft: 40,
  },
  dir: {
    display: DEFAULT_DISPLAY,
    marginTop: '1em',
    marginBottom: '1em',
    paddingLeft: 40,
  },
  li: { display: 'list-item' },
  dl: {
    display: DEFAULT_DISPLAY,
    marginTop: '1em',
    marginBottom: '1em',
  },
  dt: block,
  dd: {
    display: DEFAULT_DISPLAY,
    marginLeft: 40,
  },
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
    display: DEFAULT_DISPLAY,
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
