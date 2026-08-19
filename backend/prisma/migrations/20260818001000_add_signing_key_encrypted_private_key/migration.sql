-- AlterTable
ALTER TABLE "signing_keys" ADD COLUMN IF NOT EXISTS "encrypted_private_key" JSONB;
