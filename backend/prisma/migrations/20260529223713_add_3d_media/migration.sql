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
