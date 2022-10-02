import * as twrnc from 'twrnc/create'

const config = {
  plugins: [
    {
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
    },
  ],
}

function createTw() {
  return twrnc.create(config, 'web')
}

let tw
export default function getTw({
  width,
  height,
}: {
  width: number
  height: number
}) {
  if (!tw) {
    tw = createTw()
  }
  tw.setWindowDimensions({ width: +width, height: +height })
  return tw
}
