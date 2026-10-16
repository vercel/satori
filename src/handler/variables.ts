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
 * CSS-wide keywords that keep the inherited value of custom properties, which
 * are inherited. `initial` is the guaranteed-invalid value instead.
 */
const INHERITING_KEYWORDS = new Set([
  'inherit',
  'unset',
  'revert',
  'revert-layer',
])

/**
 * Whether the value of a custom property is its initial value, the
 * guaranteed-invalid value, so that `var()` uses its fallback.
 */
const isGuaranteedInvalid = (value: string) =>
  value.trim().toLowerCase() === 'initial'

/**
 * Merges inherited variables with current variables
 * Current variables override inherited ones (cascading)
 */
export function mergeVariables(
  inherited: CSSVariables,
  current: CSSVariables
): CSSVariables {
  const merged = { ...inherited }
  for (const name in current) {
    if (INHERITING_KEYWORDS.has(current[name].trim().toLowerCase())) continue
    merged[name] = current[name]
  }
  return merged
}

/**
 * Resolves var() references in a CSS value
 * Supports fallback values: var(--name, fallback)
 * Handles nested var() calls
 *
 * Returns `undefined` if the value is invalid at computed-value time, like in
 * browsers: a variable without a value (or with the guaranteed-invalid value
 * `initial`, or in a cycle) is used without a fallback. The declaration then
 * behaves as `unset`.
 */
/**
 * The environment variables of `env()`, as in browsers on desktops, where no
 * area is unsafe and there's no virtual keyboard. Others, e.g. the title bar
 * areas of installed apps, use their fallbacks.
 */
const ENVIRONMENT = new Map<string, string>([
  ['keyboard-inset-width', '0px'],
  ['keyboard-inset-height', '0px'],
])
for (const side of ['top', 'right', 'bottom', 'left']) {
  ENVIRONMENT.set(`safe-area-inset-${side}`, '0px')
  ENVIRONMENT.set(`safe-area-max-inset-${side}`, '0px')
  ENVIRONMENT.set(`keyboard-inset-${side}`, '0px')
}

/** Resolves `var()` and `env()` in a value. */
export function resolveVariables(
  value: string | number,
  variables: CSSVariables,
  visitedVars = new Set<string>()
): string | number | undefined {
  // Only process strings
  if (typeof value !== 'string') {
    return value
  }

  // Quick check: does this value contain var() or env()?
  if (!value.includes('var(') && !value.includes('env(')) {
    return value
  }

  try {
    const parsed = valueParser(value)
    let invalid = false

    parsed.walk((node, index, siblings) => {
      const name = node.type === 'function' && node.value.toLowerCase()
      if (invalid || (name !== 'var' && name !== 'env')) {
        return
      }

      // Extract variable name and optional fallback
      const args = extractVarArgs(node as valueParser.FunctionNode)
      if (!args) {
        invalid = true
        return false
      }
      const { varName, fallback } = args

      let resolved: string | number | undefined
      if (name === 'env') {
        resolved = ENVIRONMENT.get(varName)
      } else if (visitedVars.has(varName)) {
        console.warn(`Circular reference detected for CSS variable: ${varName}`)
      } else {
        const variableValue = variables[varName]
        if (
          variableValue !== undefined &&
          !isGuaranteedInvalid(variableValue)
        ) {
          // Mark this variable as being resolved to detect circular references,
          // and resolve var() in its value.
          resolved = resolveVariables(
            variableValue,
            variables,
            new Set(visitedVars).add(varName)
          )
        }
      }
      // Without a valid value, the fallback is used, which may be empty and
      // contain var() too.
      if (resolved === undefined && fallback !== undefined) {
        resolved = resolveVariables(fallback, variables, visitedVars)
      }
      if (resolved === undefined) {
        invalid = true
        return false
      }

      // Like in browsers, which substitute tokens, the value stays apart from
      // what's next to it, e.g. in `var(--width)10px` from minifiers, which
      // leave out spaces after functions.
      const joins = (sibling: valueParser.Node | undefined) =>
        sibling?.type === 'word' ||
        sibling?.type === 'string' ||
        sibling?.type === 'function'
      replaceNode(
        node,
        (joins(siblings[index - 1]) ? ' ' : '') +
          String(resolved) +
          (joins(siblings[index + 1]) ? ' ' : '')
      )
      return false
    })

    return invalid ? undefined : parsed.toString()
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

  // Check if there's a fallback value after the comma, which may be empty, as
  // in `var(--name,)`.
  if (commaIndex !== -1) {
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
    // Properties that are invalid at computed-value time are left out.
    const value = resolveVariables(style[prop], variables)
    if (value !== undefined) resolved[prop] = value
  }

  return resolved
}
