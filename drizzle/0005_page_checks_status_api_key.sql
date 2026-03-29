-- Page check types, public status slug, API keys for REST

ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "statusSlug" text;
CREATE UNIQUE INDEX IF NOT EXISTS "project_statusSlug_unique" ON "project" ("statusSlug") WHERE "statusSlug" IS NOT NULL;

ALTER TABLE "page" ADD COLUMN IF NOT EXISTS "checkType" text DEFAULT 'http' NOT NULL;
ALTER TABLE "page" ADD COLUMN IF NOT EXISTS "checkConfig" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE TABLE IF NOT EXISTS "api_key" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" text NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "tokenHash" text NOT NULL,
  "tokenPrefix" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "lastUsedAt" timestamp
);

CREATE INDEX IF NOT EXISTS "api_key_userId_idx" ON "api_key" ("userId");
