-- Предпочтения уведомлений на уровне пользователя (ранее на project)

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notifyEmailEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notifyWebhookEnabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notifyWebhookUrl" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notifyFailureThreshold" integer DEFAULT 2 NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notifyRecoveryEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notifyTelegramEnabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "notifyReminderIntervalMinutes" integer;

UPDATE "user" u SET
  "notifyEmailEnabled" = s."notifyEmailEnabled",
  "notifyWebhookEnabled" = s."notifyWebhookEnabled",
  "notifyWebhookUrl" = s."notifyWebhookUrl",
  "notifyFailureThreshold" = s."notifyFailureThreshold",
  "notifyRecoveryEnabled" = s."notifyRecoveryEnabled",
  "notifyTelegramEnabled" = s."notifyTelegramEnabled",
  "notifyReminderIntervalMinutes" = s."notifyReminderIntervalMinutes"
FROM (
  SELECT DISTINCT ON ("userId")
    "userId",
    "notifyEmailEnabled",
    "notifyWebhookEnabled",
    "notifyWebhookUrl",
    "notifyFailureThreshold",
    "notifyRecoveryEnabled",
    "notifyTelegramEnabled",
    "notifyReminderIntervalMinutes"
  FROM "project"
  ORDER BY "userId", "updatedAt" DESC
) s
WHERE u.id = s."userId";

ALTER TABLE "project" DROP COLUMN IF EXISTS "notifyEmailEnabled";
ALTER TABLE "project" DROP COLUMN IF EXISTS "notifyWebhookEnabled";
ALTER TABLE "project" DROP COLUMN IF EXISTS "notifyWebhookUrl";
ALTER TABLE "project" DROP COLUMN IF EXISTS "notifyFailureThreshold";
ALTER TABLE "project" DROP COLUMN IF EXISTS "notifyRecoveryEnabled";
ALTER TABLE "project" DROP COLUMN IF EXISTS "notifyTelegramEnabled";
ALTER TABLE "project" DROP COLUMN IF EXISTS "notifyReminderIntervalMinutes";
