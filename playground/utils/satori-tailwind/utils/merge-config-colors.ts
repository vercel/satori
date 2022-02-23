import type { TailwindConfig } from 'tailwindcss/tailwind-config'

/**
 * Convert `colors: { key: { 50: '...', 100: '...', ... }}` to
 *         `colors: { 'key-50': '...', 'key-100': '...' }}`
 */
export default function mergeConfigColors(
  config: TailwindConfig
): TailwindConfig {
  const colors = config.theme.colors
  let newPairs: Record<string, string> = {}
  if (!colors) return config

  for (const [key1, value] of Object.entries(colors)) {
    if (typeof value === 'object') {
      for (const [key2, color] of Object.entries(
        value as Record<string, string>
      )) {
        newPairs[`${key1}-${key2}`] = color
      }
      delete colors[key1 as keyof typeof colors]
    }
  }
  return {
    ...config,
    theme: { ...config.theme, colors: { ...config.theme.colors, ...newPairs } }
  }
}
