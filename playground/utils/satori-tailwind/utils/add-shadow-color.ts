/**
 * Naive implementation of box shadow color: Replace
 * - rgb(0 0 0 / 0.05)
 * - rgb(0 0 0 / 0.1)
 * - rgb(0 0 0 / 0.25)
 * - #0000
 * , which are preset values for shadow classes, with shadowColor.
 *
 * Should be replaced with a better implementation like: https://github.com/jxnblk/css-box-shadow
 */
const colorRegex = new RegExp('(rgb\\(0 0 0 / 0\\.(05|1|25)\\))|#0000', 'g')
export default function addShadowColor(boxShadow: string, shadowColor: string) {
  return boxShadow.replace(colorRegex, shadowColor)
}
