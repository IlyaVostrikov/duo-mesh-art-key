import type { DbClient } from '../db'

/** Generate a collision-free slug by appending -1, -2, etc. if needed. */
export async function generateUniqueSlug(
  prisma: DbClient,
  baseSlug: string,
): Promise<string> {
  let slug = baseSlug
  let counter = 1
  while (await prisma.exhibitionHall.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`
  }
  return slug
}
