/**
 * This module handles CSS custom properties (CSS variables) including:
 * - Extracting custom properties from styles (--property-name)
 * - Resolving var() references
 * - Handling fallback values
 * - Detecting circular references
 */

import valueParser from 'postcss-value-parser'

export type CSSVariables = Record<string, string>

/**
 * Extracts custom properties (--*) from a style object
 * Returns both the variables and the remaining style properties
 */
export function extractCustomProperties(
  style: Record<string, string | number>
): {
  variables: CSSVariables
  remainingStyle: Record<string, string | number>
} {
  const variables: CSSVariables = {}
  const remainingStyle: Record<string, string | number> = {}

  for (const prop in style) {
    if (prop.startsWith('--')) {
      // Custom property
      variables[prop] = String(style[prop])
    } else {
      remainingStyle[prop] = style[prop]
    }
  }

  return { variables, remainingStyle }
}

/**
 * Merges inherited variables with current variables
 * Current variables override inherited ones (cascading)
 */
export function mergeVariables(
  inherited: CSSVariables,
  current: CSSVariables
): CSSVariables {
  return { ...inherited, ...current }
}

/**
 * Resolves var() references in a CSS value
 * Supports fallback values: var(--name, fallback)
 * Handles nested var() calls
 */
export function resolveVariables(
  value: string | number,
  variables: CSSVariables,
  visitedVars = new Set<string>()
): string | number {
  // Only process strings
  if (typeof value !== 'string') {
    return value
  }

  // Quick check: does this value contain var()?
  if (!value.includes('var(')) {
    return value
  }

  try {
    const parsed = valueParser(value)
    let hasChanges = false

    parsed.walk((node) => {
      if (node.type === 'function' && node.value === 'var') {
        hasChanges = true

        // Extract variable name and optional fallback
        const args = extractVarArgs(node)
        if (!args) {
          // Invalid var() syntax, leave as-is
          return
        }

        const { varName, fallback } = args

        // Check for circular reference
        if (visitedVars.has(varName)) {
          console.warn(
            `Circular reference detected for CSS variable: ${varName}`
          )
          // Use fallback if available, otherwise use invalid value
          if (fallback !== undefined) {
            replaceNode(node, fallback)
          } else {
            replaceNode(node, 'initial')
          }
          return
        }

        // Look up the variable
        const variableValue = variables[varName]

        if (variableValue !== undefined) {
          // Mark this variable as being resolved to detect circular references
          const newVisitedVars = new Set(visitedVars)
          newVisitedVars.add(varName)

          // Recursively resolve the variable value in case it contains more var()
          const resolvedValue = resolveVariables(
            variableValue,
            variables,
            newVisitedVars
          )

          replaceNode(node, String(resolvedValue))
        } else if (fallback !== undefined) {
          // Variable not found, use fallback
          // Recursively resolve fallback in case it contains var()
          const resolvedFallback = resolveVariables(
            fallback,
            variables,
            visitedVars
          )
          replaceNode(node, String(resolvedFallback))
        } else {
          // Variable not found and no fallback, use initial value
          // According to CSS spec, this should be treated as invalid
          replaceNode(node, 'initial')
        }
      }
    })

    if (hasChanges) {
      return parsed.toString()
    }
  } catch (err) {
    // If parsing fails, return the original value
    console.warn(`Failed to parse CSS value for variable resolution: ${value}`)
  }

  return value
}

/**
 * Extracts variable name and fallback from var() function arguments
 * Handles: var(--name) and var(--name, fallback)
 */
function extractVarArgs(
  node: valueParser.FunctionNode
): { varName: string; fallback?: string } | null {
  if (!node.nodes || node.nodes.length === 0) {
    return null
  }

  // Find the variable name (first word node)
  let varNameNode: valueParser.Node | undefined
  let commaIndex = -1

  for (let i = 0; i < node.nodes.length; i++) {
    const child = node.nodes[i]
    if (child.type === 'word' && !varNameNode) {
      varNameNode = child
    } else if (child.type === 'div' && child.value === ',') {
      commaIndex = i
      break
    }
  }

  if (!varNameNode || varNameNode.type !== 'word') {
    return null
  }

  const varName = varNameNode.value.trim()

  // Check if there's a fallback value after the comma
  if (commaIndex !== -1 && commaIndex < node.nodes.length - 1) {
    // Collect all nodes after the comma as the fallback
    const fallbackNodes = node.nodes.slice(commaIndex + 1)
    const fallback = valueParser.stringify(fallbackNodes).trim()
    return { varName, fallback }
  }

  return { varName }
}

/**
 * Replaces a function node with a raw string value
 */
function replaceNode(node: valueParser.Node, value: string) {
  // Replace the function node with a word node
  node.type = 'word'
  node.value = value
  // Remove function-specific properties
  delete (node as any).nodes
}

/**
 * Resolves all variables in a style object
 * Returns a new style object with var() references resolved
 */
export function resolveStyleVariables(
  style: Record<string, string | number>,
  variables: CSSVariables
): Record<string, string | number> {
  const resolved: Record<string, string | number> = {}

  for (const prop in style) {
    resolved[prop] = resolveVariables(style[prop], variables)
  }

  return resolved
}
