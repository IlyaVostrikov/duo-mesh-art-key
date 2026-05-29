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
