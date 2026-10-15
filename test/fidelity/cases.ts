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
 * The sections to compare. Snapshots are only captured again on purpose, see
 * `capture.ts`, but selectors avoid the hashed class names of the pages,
 * which change with each deployment.
 */
export const cases: FidelityCase[] = [
  {
    name: 'nextjs-hero',
    url: 'https://nextjs.org/',
    selector: 'main > div > section:nth-of-type(1)',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-features',
    url: 'https://nextjs.org/',
    selector: 'main > div > section:nth-of-type(2) > div:nth-of-type(2) > ul',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-showcase',
    url: 'https://nextjs.org/',
    selector: 'main > div > section:nth-of-type(4) > div:nth-of-type(1)',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-footer',
    url: 'https://nextjs.org/',
    selector: 'footer',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-learn-hero',
    url: 'https://nextjs.org/learn',
    selector: 'main > div > div:nth-of-type(1)',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-learn-courses',
    url: 'https://nextjs.org/learn',
    selector: 'main > div > section:nth-of-type(1)',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-learn-deeper',
    url: 'https://nextjs.org/learn',
    selector: 'main > div > div:nth-of-type(3)',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-showcase-hero',
    url: 'https://nextjs.org/showcase',
    selector: 'main > div > section:nth-of-type(1)',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-showcase-stats',
    url: 'https://nextjs.org/showcase',
    selector: 'main > div > section:nth-of-type(2)',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-docs-tabs',
    url: 'https://nextjs.org/docs/app/getting-started/installation',
    selector: 'main > article > div:nth-of-type(6) > div:nth-of-type(1)',
    width: 1280,
    fonts: nextjs,
  },
  {
    name: 'nextjs-docs-terminal',
    url: 'https://nextjs.org/docs/app/getting-started/installation',
    selector: 'main > article > div:nth-of-type(6) > div:nth-of-type(4)',
    width: 1280,
    fonts: nextjs,
  },
]
