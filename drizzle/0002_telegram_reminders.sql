ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegramChatId" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegramLinkToken" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "telegramLinkExpires" timestamp;

ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "notifyTelegramEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "notifyReminderIntervalMinutes" integer;

ALTER TABLE "page" ADD COLUMN IF NOT EXISTS "lastDownReminderSentAt" timestamp;
