// @TODO: It seems that SVG filters are pretty expensive for resvg, PNG
// generation time 10x'd when adding this filter (WASM in browser).

export default function shadow(
  { id, width, height }: { id: number; width: number; height: number },
  style: Record<string, any>
) {
  if (
    !style.shadowColor ||
    !style.shadowOffset ||
    typeof style.shadowRadius === 'undefined'
  ) {
    return ''
  }

  const left = Math.min(style.shadowOffset.width - style.shadowRadius * 2, 0)
  const right = Math.max(
    style.shadowOffset.width + style.shadowRadius * 2 + width,
    width
  )
  const top = Math.min(style.shadowOffset.height - style.shadowRadius * 2, 0)
  const bottom = Math.max(
    style.shadowOffset.height + style.shadowRadius * 2 + height,
    height
  )

  return `<defs><filter id="satori_s-${id}" x="${(left / width) * 100}%" y="${
    (top / height) * 100
  }%" width="${((right - left) / width) * 100}%" height="${
    ((bottom - top) / height) * 100
  }%"><feDropShadow dx="${style.shadowOffset.width}" dy="${
    style.shadowOffset.height
  }" stdDeviation="${style.shadowRadius}" flood-color="${
    style.shadowColor
  }" flood-opacity="1"/></filter></defs>`
}
