-- Add unique constraint on (artKeyId, sequence) to prevent
-- duplicate sequence numbers within a provenance chain.
-- If duplicates exist (from a pre-transaction race), this will fail —
-- manual cleanup required.

CREATE UNIQUE INDEX IF NOT EXISTS "provenance_art_key_id_sequence_unique"
  ON "provenance_records" ("art_key_id", "sequence");
