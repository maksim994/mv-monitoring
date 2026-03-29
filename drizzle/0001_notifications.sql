ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "notifyEmailEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "notifyWebhookEnabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "notifyWebhookUrl" text;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "notifyFailureThreshold" integer DEFAULT 2 NOT NULL;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "notifyRecoveryEnabled" boolean DEFAULT true NOT NULL;

ALTER TABLE "page" ADD COLUMN IF NOT EXISTS "consecutiveFailures" integer DEFAULT 0 NOT NULL;
ALTER TABLE "page" ADD COLUMN IF NOT EXISTS "downNotified" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "notificationLog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL REFERENCES "project"("id") ON DELETE CASCADE,
	"pageId" uuid NOT NULL REFERENCES "page"("id") ON DELETE CASCADE,
	"channel" text NOT NULL,
	"event" text NOT NULL,
	"detail" text,
	"success" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
