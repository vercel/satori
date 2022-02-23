import type { TailwindThemeValue } from 'tailwindcss/tailwind-config'

declare module 'tailwindcss/tailwind-config' {
  export interface TailwindTheme {
    readonly flexBasis?: TailwindThemeValue
  }
}
