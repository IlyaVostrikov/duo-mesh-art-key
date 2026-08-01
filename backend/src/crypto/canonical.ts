/**
 * Recursive deterministic JSON canonicalization (RFC 8785 / JCS-style).
 * Keys sorted alphabetically at every nesting level, no whitespace.
 * Same output for logically equivalent objects regardless of key insertion order.
 */
export function canonicalJSON(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize)
  }

  // Object — sort keys alphabetically, recurse into values
  const sorted = Object.keys(value as Record<string, unknown>)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = canonicalize((value as Record<string, unknown>)[key])
      return acc
    }, {})

  return sorted
}
