-- Step 1: Add column (nullable initially so we can backfill)
ALTER TABLE "provenance_records" ADD COLUMN "occurred_at" TIMESTAMPTZ;

-- Step 2: Backfill — use createdAt as occurredAt for existing records
UPDATE "provenance_records" SET "occurred_at" = "created_at";

-- Step 3: Make it NOT NULL with a default for future inserts
ALTER TABLE "provenance_records" ALTER COLUMN "occurred_at" SET NOT NULL;
ALTER TABLE "provenance_records" ALTER COLUMN "occurred_at" SET DEFAULT NOW();
