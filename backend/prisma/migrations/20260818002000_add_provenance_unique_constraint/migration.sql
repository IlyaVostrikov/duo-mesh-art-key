-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "provenance_art_key_id_sequence_unique" ON "provenance_records"("art_key_id", "sequence");
