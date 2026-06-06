-- CreateEnum
CREATE TYPE "TransparencyEntryType" AS ENUM ('ARTKEY_CREATED', 'PROVENANCE_RECORD', 'ARTKEY_REVOKED');

-- CreateTable
CREATE TABLE "transparency_log" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "art_key_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "entry_type" "TransparencyEntryType" NOT NULL,
    "entry_hash" TEXT NOT NULL,
    "prev_entry_hash" TEXT,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transparency_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transparency_log_created_at_idx" ON "transparency_log"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "transparency_log_art_key_id_sequence_key" ON "transparency_log"("art_key_id", "sequence");

-- AddForeignKey
ALTER TABLE "transparency_log" ADD CONSTRAINT "transparency_log_art_key_id_fkey" FOREIGN KEY ("art_key_id") REFERENCES "art_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;
