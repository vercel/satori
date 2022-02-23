import { type CSSProperties } from 'react'
import {
  processNonNumeric,
  processDirection,
  processNumeric,
  processFont,
  processText,
  processBorderColor,
  processShadow,
  processTransform,
  processBackground,
  processGradient
} from './processors'
import type { TailwindConfig } from 'tailwindcss/tailwind-config'
import resolveConfig from 'tailwindcss/resolveConfig'
import mergeConfigColors from './utils/merge-config-colors'
import addShadowColor from './utils/add-shadow-color'
import addOpacity from './utils/add-opacity'
import preflight from './preflight'

export interface SatoriTailwind {
  processClassName: (s?: string) => CSSProperties
  preflight: (s?: keyof JSX.IntrinsicElements) => CSSProperties
}

export function createSatoriTailwind(
  tailwindConfig?: TailwindConfig
): SatoriTailwind {
  const config = mergeConfigColors(
    resolveConfig(
      tailwindConfig ?? {
        theme: {}
      }
    )
  )
  /**
   * Stores both:
   * 1. full string -> full styles
   * 2. each class name -> each style
   */
  const cache: Record<string, CSSProperties | undefined> = {}
  const processClassName = (s?: string) => {
    if (!s) return {}

    const sTrimmed = s.trim()
    const cachedFullStyles = cache[sTrimmed]
    if (cachedFullStyles) {
      return cachedFullStyles
    }

    let styles: CSSProperties = {}
    let transformStyles: CSSProperties['transform'][] = []
    const classNames = sTrimmed.split(/\s+/)

    for (let className of classNames) {
      let isNegative = false
      if (className[0] === '-') {
        isNegative = true
        className = className.slice(1)
      }

      const transformStyle = processTransform(className, isNegative, config)
      if (transformStyle) {
        transformStyles.push(transformStyle)
      }
    }

    if (transformStyles.length) {
      styles['transform'] = transformStyles.join(' ')
    }

    for (let className of classNames) {
      const cachedStyles = cache[className]
      if (cachedStyles) {
        styles = { ...cachedStyles, ...styles }
        continue
      }

      let isNegative = false
      if (className[0] === '-') {
        isNegative = true
        className = className.slice(1)
      }

      const newStyles =
        processDirection(className, isNegative, config) ??
        processNumeric(className, isNegative, config) ??
        processNonNumeric(className) ??
        processFont(className, config) ??
        processText(className, config) ??
        processBorderColor(className, config) ??
        processShadow(className, config) ??
        processBackground(className, config) ??
        processGradient(className, config)

      if (newStyles) {
        cache[className] = newStyles
        styles = { ...newStyles, ...styles }
      }
    }

    const shadowColor = styles['--tw-shadow-color' as keyof typeof styles] as
      | string
      | undefined
    if (styles.boxShadow && shadowColor) {
      styles.boxShadow = addShadowColor(styles.boxShadow, shadowColor)
    }
    delete styles['--tw-shadow-color' as keyof typeof styles]

    const gradientFrom = styles['--tw-gradient-from' as keyof typeof styles] as
      | string
      | undefined
    const gradientVia = styles['--tw-gradient-via' as keyof typeof styles] as
      | string
      | undefined
    let gradientTo = styles['--tw-gradient-to' as keyof typeof styles] as
      | string
      | undefined

    if (
      styles.backgroundImage &&
      styles.backgroundImage.includes('var(--tw-gradient-stops)') &&
      gradientFrom
    ) {
      let gradientStops: string
      if (gradientFrom && gradientVia) {
        if (!gradientTo) {
          gradientTo = addOpacity(gradientVia, '0')
        }
        gradientStops = `${gradientFrom}, ${gradientVia}, ${gradientTo}`
      } else {
        if (!gradientTo) {
          gradientTo = addOpacity(gradientFrom, '0')
        }
        gradientStops = `${gradientFrom}, ${gradientTo}`
      }

      styles.backgroundImage = styles.backgroundImage.replace(
        /var\(--tw-gradient-stops\)/g,
        gradientStops
      )
    }
    delete styles['--tw-gradient-from' as keyof typeof styles]
    delete styles['--tw-gradient-via' as keyof typeof styles]
    delete styles['--tw-gradient-to' as keyof typeof styles]

    cache[sTrimmed] = styles
    return styles
  }

  return { processClassName, preflight: preflight() }
}
