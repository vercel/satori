import type { TwConfig } from 'twrnc'

import * as twrnc from 'twrnc/create'

type TwPlugin = TwConfig['plugins'][number]

const defaultShadows: TwPlugin = {
  handler: ({ addUtilities }) => {
    const presets = {
      'shadow-sm': { boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' },
      shadow: {
        boxShadow:
          '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      },
      'shadow-md': {
        boxShadow:
          '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      },
      'shadow-lg': {
        boxShadow:
          '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      'shadow-xl': {
        boxShadow:
          '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      },
      'shadow-2xl': {
        boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      'shadow-inner': {
        boxShadow: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },
      'shadow-none': { boxShadow: '0 0 #0000' },
    }

    addUtilities(presets)
  },
}

function createTw(config?: TwConfig) {
  return twrnc.create(
    {
      ...config,
      plugins: [...(config?.plugins ?? []), defaultShadows],
    },
    'web'
  )
}

let tw
export default function getTw({
  width,
  height,
  config,
}: {
  width: number
  height: number
  config?: TwConfig
}) {
  if (!tw) {
    tw = createTw(config)
  }
  tw.setWindowDimensions({ width: +width, height: +height })
  return tw
}
