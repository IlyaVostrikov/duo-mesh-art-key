-- DUO MESH ArtKey — all migrations (10 total)
-- For Neon SQL Editor

-- ============================
-- 20260516170057_init
-- ============================

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "user_agent" TEXT,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================
-- 20260529211058_init
-- ============================

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('GUEST', 'ARTIST', 'COLLECTOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ArtistTier" AS ENUM ('FREE', 'PRO', 'GALLERY');

-- CreateEnum
CREATE TYPE "ArtworkCategory" AS ENUM ('PAINTING', 'DIGITAL', 'PHOTOGRAPHY', 'SCULPTURE', 'MIXED_MEDIA', 'NFT', 'PRINT', 'DRAWING', 'OTHER');

-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('DRAFT', 'LISTED', 'IN_EXHIBITION', 'SOLD', 'RESERVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EditionType" AS ENUM ('UNIQUE', 'LIMITED', 'OPEN');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('CREATION', 'PRIMARY_SALE', 'SECONDARY_SALE', 'GIFT', 'INHERITANCE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ExhibitionType" AS ENUM ('SOLO', 'GROUP', 'CURATED');

-- CreateEnum
CREATE TYPE "SaleType" AS ENUM ('DIRECT_SALE', 'AUCTION_WIN', 'OFFER_ACCEPTED');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PREMIERE_SOON', 'PREMIERE_STARTED', 'ARTWORK_SOLD', 'NEW_FOLLOWER', 'OFFER_RECEIVED', 'OFFER_ACCEPTED', 'COLLECTION_UPDATED', 'NEW_ARTWORK', 'EXHIBITION_INVITE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_url" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'GUEST',
ADD COLUMN     "social_links" JSONB;

-- CreateTable
CREATE TABLE "artists" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "artist_statement" TEXT,
    "website_url" TEXT,
    "location" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "tier" "ArtistTier" NOT NULL DEFAULT 'FREE',
    "tier_expires_at" TIMESTAMP(3),
    "total_sales_count" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(15,2) DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collectors" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "shipping_address" JSONB,
    "payment_methods" JSONB,
    "preferences" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "artworks" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "artist_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "year" INTEGER,
    "medium" TEXT,
    "dimensions" TEXT,
    "category" "ArtworkCategory" NOT NULL DEFAULT 'OTHER',
    "style_tags" TEXT[],
    "images" TEXT[],
    "is_digital_original" BOOLEAN NOT NULL DEFAULT false,
    "is_physical_digitized" BOOLEAN NOT NULL DEFAULT false,
    "status" "ArtworkStatus" NOT NULL DEFAULT 'DRAFT',
    "price" DECIMAL(15,2),
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "edition_type" "EditionType" NOT NULL DEFAULT 'UNIQUE',
    "edition_total" INTEGER,
    "edition_number" INTEGER,
    "allow_offers" BOOLEAN NOT NULL DEFAULT true,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "save_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "artworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibition_halls" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "artist_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "layout_config" JSONB,
    "theme" TEXT DEFAULT 'default',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibition_halls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "art_keys" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "artwork_id" UUID NOT NULL,
    "key_code" TEXT NOT NULL,
    "owner_key" TEXT NOT NULL,
    "certificate_hash" TEXT NOT NULL,
    "certificate_pdf_url" TEXT,
    "qr_code_url" TEXT,
    "nfc_id" TEXT,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "art_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provenance_records" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "artwork_id" UUID NOT NULL,
    "art_key_id" UUID NOT NULL,
    "from_user_id" UUID,
    "to_user_id" UUID NOT NULL,
    "transfer_type" "TransferType" NOT NULL DEFAULT 'CREATION',
    "price" DECIMAL(15,2),
    "royalty_percent" DECIMAL(5,2) DEFAULT 10,
    "royalty_paid" DECIMAL(15,2),
    "transaction_hash" TEXT,
    "prev_record_hash" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibitions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "type" "ExhibitionType" NOT NULL DEFAULT 'SOLO',
    "organizer_id" UUID NOT NULL,
    "curator_id" UUID,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_premiere" BOOLEAN NOT NULL DEFAULT false,
    "countdown_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exhibitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exhibition_artworks" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "exhibition_id" UUID NOT NULL,
    "artwork_id" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exhibition_artworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "artwork_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "buyer_id" UUID NOT NULL,
    "type" "SaleType" NOT NULL DEFAULT 'DIRECT_SALE',
    "price" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "commission_percent" DECIMAL(5,2) NOT NULL DEFAULT 12,
    "commission_amount" DECIMAL(15,2),
    "platform_fee" DECIMAL(15,2),
    "seller_payout" DECIMAL(15,2),
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_hash" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "collector_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "cover_artwork_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_artworks" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "collection_id" UUID NOT NULL,
    "artwork_id" UUID NOT NULL,
    "note" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_artworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "follower_id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "artwork_id" UUID NOT NULL,
    "from_name" TEXT NOT NULL,
    "from_email" TEXT NOT NULL,
    "message" TEXT,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "artists_user_id_key" ON "artists"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "collectors_user_id_key" ON "collectors"("user_id");

-- CreateIndex
CREATE INDEX "artworks_artist_id_idx" ON "artworks"("artist_id");

-- CreateIndex
CREATE INDEX "artworks_status_idx" ON "artworks"("status");

-- CreateIndex
CREATE INDEX "artworks_category_idx" ON "artworks"("category");

-- CreateIndex
CREATE INDEX "artworks_price_idx" ON "artworks"("price");

-- CreateIndex
CREATE INDEX "artworks_created_at_idx" ON "artworks"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "exhibition_halls_artist_id_key" ON "exhibition_halls"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "exhibition_halls_slug_key" ON "exhibition_halls"("slug");

-- CreateIndex
CREATE INDEX "halls_slug_idx" ON "exhibition_halls"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "art_keys_artwork_id_key" ON "art_keys"("artwork_id");

-- CreateIndex
CREATE UNIQUE INDEX "art_keys_key_code_key" ON "art_keys"("key_code");

-- CreateIndex
CREATE UNIQUE INDEX "art_keys_owner_key_key" ON "art_keys"("owner_key");

-- CreateIndex
CREATE INDEX "art_keys_key_code_idx" ON "art_keys"("key_code");

-- CreateIndex
CREATE INDEX "provenance_artwork_id_created_at_idx" ON "provenance_records"("artwork_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "exhibitions_slug_key" ON "exhibitions"("slug");

-- CreateIndex
CREATE INDEX "exhibitions_slug_idx" ON "exhibitions"("slug");

-- CreateIndex
CREATE INDEX "exhibitions_starts_at_idx" ON "exhibitions"("starts_at");

-- CreateIndex
CREATE INDEX "exhibition_artworks_exhibition_id_position_idx" ON "exhibition_artworks"("exhibition_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "exhibition_artworks_unique" ON "exhibition_artworks"("exhibition_id", "artwork_id");

-- CreateIndex
CREATE INDEX "sales_artwork_id_idx" ON "sales"("artwork_id");

-- CreateIndex
CREATE INDEX "sales_seller_id_idx" ON "sales"("seller_id");

-- CreateIndex
CREATE INDEX "sales_buyer_id_idx" ON "sales"("buyer_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_artworks_unique" ON "collection_artworks"("collection_id", "artwork_id");

-- CreateIndex
CREATE INDEX "follows_artist_id_idx" ON "follows"("artist_id");

-- CreateIndex
CREATE UNIQUE INDEX "follows_unique" ON "follows"("follower_id", "artist_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "inquiries_artwork_id_idx" ON "inquiries"("artwork_id");

-- AddForeignKey
ALTER TABLE "artists" ADD CONSTRAINT "artists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "artworks" ADD CONSTRAINT "artworks_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibition_halls" ADD CONSTRAINT "halls_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "art_keys" ADD CONSTRAINT "art_keys_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_records" ADD CONSTRAINT "provenance_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_records" ADD CONSTRAINT "provenance_art_key_id_fkey" FOREIGN KEY ("art_key_id") REFERENCES "art_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_records" ADD CONSTRAINT "provenance_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_records" ADD CONSTRAINT "provenance_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibitions" ADD CONSTRAINT "exhibitions_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibition_artworks" ADD CONSTRAINT "exhibition_artworks_exhibition_id_fkey" FOREIGN KEY ("exhibition_id") REFERENCES "exhibitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exhibition_artworks" ADD CONSTRAINT "exhibition_artworks_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "collectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_collector_id_fkey" FOREIGN KEY ("collector_id") REFERENCES "collectors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_artworks" ADD CONSTRAINT "collection_artworks_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_artworks" ADD CONSTRAINT "collection_artworks_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_artwork_id_fkey" FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ============================
-- 20260529223713_add_3d_media
-- ============================

/*
  Warnings:

  - Added the required column `integrity_hash` to the `art_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `poster_url` to the `artworks` table without a default value. This is not possible if the table is not empty.
  - Added the required column `record_hash` to the `provenance_records` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE_2D', 'MODEL_3D');

-- CreateEnum
CREATE TYPE "CreationSoftware" AS ENUM ('BLENDER', 'ZBRUSH', 'SCAN', 'OTHER');

-- AlterTable
ALTER TABLE "art_keys" ADD COLUMN     "integrity_hash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "artworks" ADD COLUMN     "is_scanned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "media_type" "MediaType" NOT NULL DEFAULT 'IMAGE_2D',
ADD COLUMN     "model_url" TEXT,
ADD COLUMN     "poly_count" INTEGER,
ADD COLUMN     "poster_url" TEXT NOT NULL,
ADD COLUMN     "software" "CreationSoftware";

-- AlterTable
ALTER TABLE "provenance_records" ADD COLUMN     "record_hash" TEXT NOT NULL,
ADD COLUMN     "sequence" INTEGER NOT NULL DEFAULT 0;


-- ============================
-- 20260529223730_add_provenance_sequence_idx
-- ============================

-- CreateIndex
CREATE INDEX "provenance_artwork_id_sequence_idx" ON "provenance_records"("artwork_id", "sequence");


-- ============================
-- 20260605151726_add_hall_customization
-- ============================

-- AlterTable
ALTER TABLE "exhibition_halls" ADD COLUMN     "customization" JSONB;


-- ============================
-- 20260605212427_add_signing_keys_and_provenance_signatures
-- ============================

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


-- ============================
-- 20260606140525_add_transparency_log
-- ============================

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


-- ============================
-- 20260606160000_add_inquiry_received_to_notification_type
-- ============================

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'INQUIRY_RECEIVED';


-- ============================
-- 20260606225038_add_session_family_id
-- ============================

-- Add family_id as nullable first
ALTER TABLE "auth_sessions" ADD COLUMN "family_id" UUID;

-- Backfill existing rows: each session gets its own family (id as family)
UPDATE "auth_sessions" SET "family_id" = id WHERE "family_id" IS NULL;

-- Make it required for future rows
ALTER TABLE "auth_sessions" ALTER COLUMN "family_id" SET NOT NULL;

-- Create index for family-based queries (reuse detection, mass revoke)
CREATE INDEX "auth_sessions_family_id_idx" ON "auth_sessions"("family_id");


-- ============================
-- 20260607220000_add_registry_attestation
-- ============================

-- Add REGISTRY to SigningKeyOwnerType enum
ALTER TYPE "SigningKeyOwnerType" ADD VALUE 'REGISTRY';

-- RegistryAttestation: REGISTRY-signed binding of {artistId, artistPublicKey, artworkId}
CREATE TABLE "registry_attestations" (
  "id"                UUID         NOT NULL DEFAULT uuidv7(),
  "artist_id"         UUID         NOT NULL,
  "artist_public_key" TEXT         NOT NULL,
  "artwork_id"        UUID         NOT NULL,
  "granted_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  "registry_key_id"   UUID         NOT NULL,
  "signature"         TEXT         NOT NULL,
  "revoked_at"        TIMESTAMPTZ,
  "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT now(),

  CONSTRAINT "registry_attestations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "registry_attestations_artwork_id_fkey"
    FOREIGN KEY ("artwork_id") REFERENCES "artworks"("id") ON DELETE CASCADE,
  CONSTRAINT "registry_attestations_artist_id_fkey"
    FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "registry_attestations_artwork_id_key" ON "registry_attestations"("artwork_id");
CREATE INDEX "registry_attestations_artist_id_idx" ON "registry_attestations"("artist_id");
CREATE INDEX "registry_attestations_artwork_id_idx" ON "registry_attestations"("artwork_id");

-- kid for REGISTRY-signed transfer records
ALTER TABLE "provenance_records" ADD COLUMN "registry_key_id" UUID;

-- Dedicated hash-input column, always set by application
ALTER TABLE "provenance_records" ADD COLUMN "occurred_at" TIMESTAMPTZ NOT NULL DEFAULT now();


