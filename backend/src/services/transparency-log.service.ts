import { createHash } from 'node:crypto'
import { canonicalJSON } from '../crypto/canonical'
import type { DbClient } from '../db'

type EntryType = 'ARTKEY_CREATED' | 'PROVENANCE_RECORD' | 'ARTKEY_REVOKED'

interface AppendParams {
  artKeyId: string
  entryType: EntryType
  payload: Record<string, unknown>
}

export class TransparencyLogService {
  constructor(private prisma: DbClient) {}

  /** Append an entry to the transparency log. Entries are immutable. */
  async append(params: AppendParams) {
    const { artKeyId, entryType, payload } = params

    // Find last sequence number for this ArtKey
    const last = await this.prisma.transparencyLogEntry.findFirst({
      where: { artKeyId },
      orderBy: { sequence: 'desc' },
      select: { sequence: true, entryHash: true },
    })

    const sequence = (last?.sequence ?? -1) + 1
    const prevEntryHash = last?.entryHash ?? null

    // Build and hash the entry
    const entryPayload = {
      artKeyId,
      sequence,
      entryType,
      timestamp: new Date().toISOString(),
      ...payload,
    }
    const entryHash = createHash('sha256')
      .update(canonicalJSON(entryPayload))
      .digest('hex')

    return this.prisma.transparencyLogEntry.create({
      data: {
        artKeyId,
        sequence,
        entryType,
        entryHash,
        prevEntryHash,
        payload: entryPayload,
      },
    })
  }

  /** Get all entries for an ArtKey, ordered by sequence. */
  async getByArtKey(artKeyId: string) {
    return this.prisma.transparencyLogEntry.findMany({
      where: { artKeyId },
      orderBy: { sequence: 'asc' },
    })
  }

  /** Get the global log (paginated, newest first). */
  async getGlobal(page: number, pageSize: number) {
    const [entries, total] = await Promise.all([
      this.prisma.transparencyLogEntry.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          artKey: { select: { keyCode: true } },
        },
      }),
      this.prisma.transparencyLogEntry.count(),
    ])
    return { entries, total, page, pageSize }
  }

  /** Verify the integrity of an ArtKey's transparency log entries. */
  async verify(artKeyId: string): Promise<{
    entries: number
    allOk: boolean
    checks: Array<{ sequence: number; pass: boolean; detail: string }>
  }> {
    const entries = await this.prisma.transparencyLogEntry.findMany({
      where: { artKeyId },
      orderBy: { sequence: 'asc' },
    })

    if (entries.length === 0) {
      return { entries: 0, allOk: true, checks: [] }
    }

    const checks: Array<{ sequence: number; pass: boolean; detail: string }> = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]

      // Recalculate entry hash
      const recalculated = createHash('sha256')
        .update(canonicalJSON(entry.payload as Record<string, unknown>))
        .digest('hex')
      const hashOk = recalculated === entry.entryHash

      checks.push({
        sequence: entry.sequence,
        pass: hashOk,
        detail: hashOk
          ? 'Entry hash correct'
          : `Hash mismatch: stored ${entry.entryHash.slice(0, 16)}… vs recalculated ${recalculated.slice(0, 16)}…`,
      })

      // Verify chain link
      if (i > 0 && entry.prevEntryHash !== entries[i - 1].entryHash) {
        checks.push({
          sequence: entry.sequence,
          pass: false,
          detail: `Chain broken: prevEntryHash does not match entry ${entries[i - 1].sequence}`,
        })
      }
    }

    const allOk = checks.every((c) => c.pass)
    return { entries: entries.length, allOk, checks }
  }
}
