// Detection of Prisma P2002 unique-constraint violations, robust to the
// driver-specific shape of `meta`. Prisma reports the violated columns as
// `meta.target` (an array of field names); @prisma/adapter-pg leaves `target`
// undefined and surfaces them via `meta.driverAdapterError.cause.constraint.fields`
// in snake_case column names. `meta.modelName` is populated by both.

export function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
}

/**
 * True when `err` is a P2002 raised against `modelName`'s `prismaFields` unique
 * constraint. `modelName` is the primary signal: a model with a single unique
 * constraint maps any P2002 to exactly one constraint. The column-set fallback
 * covers drivers that don't populate `modelName`.
 *
 * WARNING: the `modelName` short-circuit below assumes the model has exactly one
 * unique constraint. Do not reuse this for a model with multiple unique
 * constraints — a P2002 on the wrong column set would be mis-attributed.
 */
export function isUniqueConstraintOn(
  err: unknown,
  modelName: string,
  prismaFields: readonly [string, string],
): boolean {
  if (!isUniqueConstraintError(err)) return false
  const meta = (err as { meta?: Record<string, unknown> }).meta
  if (!meta) return false
  if (meta.modelName === modelName) return true

  const fields = new Set<string>()
  const cause = (meta.driverAdapterError as { cause?: { constraint?: { fields?: string[] } } } | undefined)?.cause
  for (const f of cause?.constraint?.fields ?? []) fields.add(f)
  const target = meta.target
  if (Array.isArray(target)) for (const t of target) fields.add(String(t))

  const [a, b] = prismaFields
  const aSnake = toSnakeCase(a)
  const bSnake = toSnakeCase(b)
  return (fields.has(a) && fields.has(b)) || (fields.has(aSnake) && fields.has(bSnake))
}

function toSnakeCase(s: string): string {
  return s.replace(/[A-Z]/g, (ch) => '_' + ch.toLowerCase())
}
