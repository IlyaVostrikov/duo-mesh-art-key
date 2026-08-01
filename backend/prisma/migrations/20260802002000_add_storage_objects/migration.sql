-- Storage object manifest: tracks every uploaded file with owner, checksum, and state.
-- PENDING = presigned URL created, upload not confirmed.
-- FINALIZED = upload confirmed, checksum verified.
-- ARCHIVED = no longer active.

CREATE TYPE "StorageObjectState" AS ENUM ('PENDING', 'FINALIZED', 'ARCHIVED');

CREATE TABLE "storage_objects" (
  "id"          UUID                NOT NULL DEFAULT uuidv7(),
  "key"         TEXT                NOT NULL,
  "owner_id"    UUID                NOT NULL,
  "artwork_id"  UUID,
  "file_name"   TEXT                NOT NULL,
  "content_type" TEXT               NOT NULL,
  "byte_size"   INTEGER             NOT NULL,
  "checksum"    TEXT,
  "visibility"  TEXT                NOT NULL DEFAULT 'public',
  "state"       "StorageObjectState" NOT NULL DEFAULT 'PENDING',
  "metadata"    JSONB,
  "created_at"  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

  CONSTRAINT "storage_objects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "storage_objects_key_key" UNIQUE ("key"),
  CONSTRAINT "storage_objects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id"),
  CONSTRAINT "storage_objects_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE SET NULL
);

CREATE INDEX "storage_objects_owner_id_idx" ON "storage_objects" ("owner_id");
CREATE INDEX "storage_objects_artwork_id_idx" ON "storage_objects" ("artwork_id");
CREATE INDEX "storage_objects_state_idx" ON "storage_objects" ("state");
