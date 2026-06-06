-- CreateEnum
CREATE TYPE "SigningKeyOwnerType" AS ENUM ('ARTIST', 'PLATFORM');

-- AlterTable
ALTER TABLE "art_keys" ADD COLUMN     "artist_signing_key_id" UUID,
ADD COLUMN     "platform_signature" TEXT,
ADD COLUMN     "platform_signing_key_id" UUID,
ADD COLUMN     "timestamp_token" TEXT,
ADD COLUMN     "timestamp_verified_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "artworks" ADD COLUMN     "content_hashes" JSONB;

-- AlterTable
ALTER TABLE "provenance_records" ADD COLUMN     "signature" TEXT,
ADD COLUMN     "signer_public_key" TEXT,
ADD COLUMN     "signer_role" TEXT,
ADD COLUMN     "signing_key_id" UUID;

-- CreateTable
CREATE TABLE "signing_keys" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "owner_type" "SigningKeyOwnerType" NOT NULL,
    "owner_id" UUID,
    "public_key" TEXT NOT NULL,
    "key_alias" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "signing_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "signing_keys_owner_idx" ON "signing_keys"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "signing_keys_public_key_idx" ON "signing_keys"("public_key");

-- CreateIndex
CREATE INDEX "collections_collector_id_idx" ON "collections"("collector_id");

-- AddForeignKey
ALTER TABLE "signing_keys" ADD CONSTRAINT "signing_keys_artist_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "artists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_keys" ADD CONSTRAINT "art_keys_artist_signing_key_id_fkey" FOREIGN KEY ("artist_signing_key_id") REFERENCES "signing_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_keys" ADD CONSTRAINT "art_keys_platform_signing_key_id_fkey" FOREIGN KEY ("platform_signing_key_id") REFERENCES "signing_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_records" ADD CONSTRAINT "provenance_signing_key_id_fkey" FOREIGN KEY ("signing_key_id") REFERENCES "signing_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
