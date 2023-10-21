export function stringFromCode(code: string): string {
  code = code.replace('U+', '0x')

  return String.fromCodePoint(Number(code))
}

export const Space = stringFromCode('U+0020')
export const Tab = stringFromCode('U+0009')
export const HorizontalEllipsis = stringFromCode('U+2026')
