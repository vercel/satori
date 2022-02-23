import { type CSSProperties } from 'react'

const mapping: Record<string, CSSProperties | undefined> = {
  hidden: { display: 'none' },
  flex: { display: 'flex' },

  relative: { position: 'relative' },
  absolute: { position: 'absolute' },

  'flex-row': { flexDirection: 'row' },
  'flex-row-reverse': { flexDirection: 'row-reverse' },
  'flex-col': { flexDirection: 'column' },
  'flex-col-reverse': { flexDirection: 'column-reverse' },

  'flex-wrap': { flexWrap: 'wrap' },
  'flex-wrap-reverse': { flexWrap: 'wrap-reverse' },
  'flex-nowrap': { flexWrap: 'nowrap' },

  'items-start': { alignItems: 'flex-start' },
  'items-end': { alignItems: 'flex-end' },
  'items-center': { alignItems: 'center' },
  'items-baseline': { alignItems: 'baseline' },
  'items-stretch': { alignItems: 'stretch' },

  'content-center': { alignContent: 'center' },
  'content-start': { alignContent: 'flex-start' },
  'content-end': { alignContent: 'flex-end' },
  'content-between': { alignContent: 'space-between' },
  'content-around': { alignContent: 'space-around' },
  'content-evenly': { alignContent: 'space-evenly' },

  'self-auto': { alignSelf: 'auto' },
  'self-start': { alignSelf: 'flex-start' },
  'self-end': { alignSelf: 'flex-end' },
  'self-center': { alignSelf: 'center' },
  'self-stretch': { alignSelf: 'stretch' },
  'self-baseline': { alignSelf: 'baseline' },

  'justify-center': { justifyContent: 'center' },
  'justify-start': { justifyContent: 'flex-start' },
  'justify-end': { justifyContent: 'flex-end' },
  'justify-between': { justifyContent: 'space-between' },
  'justify-around': { justifyContent: 'space-around' },
  'justify-evenly': { justifyContent: 'space-evenly' },

  // Only visible and hidden are supported
  'overflow-hidden': { overflow: 'hidden' },
  'overflow-visible': { overflow: 'visible' },
  'overflow-x-hidden': { overflowX: 'hidden' },
  'overflow-y-hidden': { overflowY: 'hidden' },
  'overflow-x-visible': { overflowX: 'visible' },
  'overflow-y-visible': { overflowY: 'visible' },

  // Only contain, cover, and none are supported
  'object-contain': { objectFit: 'contain' },
  'object-cover': { objectFit: 'cover' },
  'object-none': { objectFit: 'none' },

  // Only normal and break-all are supported
  'break-normal': { overflowWrap: 'normal', wordBreak: 'normal' },
  'break-all': { wordBreak: 'break-all' },

  'border-solid': { borderStyle: 'solid' },
  'border-dashed': { borderStyle: 'dashed' },
  'border-dotted': { borderStyle: 'dotted' },
  'border-double': { borderStyle: 'double' },
  'border-hidden': { borderStyle: 'hidden' },
  'border-none': { borderStyle: 'none' },

  uppercase: { textTransform: 'uppercase' },
  lowercase: { textTransform: 'lowercase' },
  capitalize: { textTransform: 'capitalize' },
  'normal-case': { textTransform: 'none' },

  'text-left': { textAlign: 'left' },
  'text-center': { textAlign: 'center' },
  'text-right': { textAlign: 'right' },
  'text-justify': { textAlign: 'justify' },

  italic: { fontStyle: 'italic' },
  'not-italic': { fontStyle: 'normal' }
}

/**
 * Handles non-numeric, non-customizable classes.
 */
export default function processNonNumeric(
  className: string
): CSSProperties | undefined {
  return mapping[className]
}
