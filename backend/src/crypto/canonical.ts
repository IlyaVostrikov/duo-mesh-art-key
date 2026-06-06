/**
 * Deterministic JSON canonicalization: keys sorted alphabetically, no whitespace.
 * Same output for logically equivalent objects regardless of key insertion order.
 */
export function canonicalJSON(obj: Record<string, unknown>): string {
  const sorted = Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = obj[key]
      return acc
    }, {})
  return JSON.stringify(sorted)
}
