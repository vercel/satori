import type { FidelityCase, FontFile } from './snapshot.ts'

/**
 * Static fonts for the variable Geist fonts of vercel.com and nextjs.org,
 * which Satori can't parse yet. Chrome uses the same files.
 */
const geist = (family: string): FontFile[] => [
  { family, file: 'test/benchmark/Geist-Regular.otf', weight: 400 },
  { family, file: 'test/benchmark/Geist-Medium.otf', weight: 500 },
  { family, file: 'test/benchmark/Geist-SemiBold.otf', weight: 600 },
  { family, file: 'test/benchmark/Geist-Bold.otf', weight: 700 },
  { family, file: 'test/benchmark/Geist-Black.otf', weight: 900 },
]
const geistMono = (family: string): FontFile[] => [
  { family, file: 'test/assets/GeistMono-Regular.ttf', weight: 400 },
]

const nextjs = [...geist('GeistSans'), ...geistMono('Geist Mono')]

/**
 * The sections to compare. Selectors may use the hashed class names of the
 * page, since snapshots are only captured again on purpose, see `capture.ts`.
 */
export const cases: FidelityCase[] = [
  {
    name: 'nextjs-hero',
    url: 'https://nextjs.org/',
    selector: '[class*="_intro"]',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-features',
    url: 'https://nextjs.org/',
    selector: 'section[class*="fXK_Ja_root"]',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-showcase',
    url: 'https://nextjs.org/',
    selector: 'section[class*="enIFoq_root"]',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-footer',
    url: 'https://nextjs.org/',
    selector: 'footer[class*="_footer"]',
    width: 1280,
    fonts: nextjs,
  },
]
