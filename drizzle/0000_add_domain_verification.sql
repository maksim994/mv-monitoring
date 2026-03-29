ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "domainVerificationToken" text;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "domainVerifiedAt" timestamp;
UPDATE "project" SET "domainVerifiedAt" = NOW() WHERE "domain" IS NOT NULL AND "domainVerifiedAt" IS NULL;
