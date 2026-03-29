-- Billing, admin roles, plan limits, marketing copy, billing audit

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "planTier" text DEFAULT 'free' NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "proValidUntil" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "proAutoRenew" boolean DEFAULT true NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "yookassaPaymentMethodId" text;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "subscriptionNextChargeAt" timestamp;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean DEFAULT false NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'user' NOT NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "personalDataConsentAt" timestamp;

CREATE TABLE IF NOT EXISTS "plan_limit" (
  "planKey" text PRIMARY KEY NOT NULL,
  "maxProjects" integer NOT NULL,
  "maxPagesPerUser" integer NOT NULL,
  "minIntervalMinutes" integer NOT NULL,
  "allowTelegram" boolean DEFAULT false NOT NULL,
  "allowWebhook" boolean DEFAULT false NOT NULL,
  "priceRubPerMonth" integer DEFAULT 0 NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "plan_limit" ("planKey", "maxProjects", "maxPagesPerUser", "minIntervalMinutes", "allowTelegram", "allowWebhook", "priceRubPerMonth")
VALUES
  ('free', 1, 5, 60, false, false, 0),
  ('pro', 20, 200, 5, true, true, 299)
ON CONFLICT ("planKey") DO NOTHING;

CREATE TABLE IF NOT EXISTS "site_marketing" (
  "key" text PRIMARY KEY NOT NULL,
  "value" text NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

INSERT INTO "site_marketing" ("key", "value")
VALUES
  ('home_hero_title', 'Мы создаем надежный мониторинг'),
  ('home_hero_subtitle', 'Высокопроизводительная инфраструктура для проверки доступности ваших сайтов. Встроенные сетевые утилиты, точные графики и мгновенные уведомления.'),
  ('pricing_intro', 'Выберите план. Лимиты и цену PRO можно менять в админ-панели — на сайте всегда актуальные значения.')
ON CONFLICT ("key") DO NOTHING;

CREATE TABLE IF NOT EXISTS "billing_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "yookassaPaymentId" text NOT NULL UNIQUE,
  "userId" text REFERENCES "user"("id") ON DELETE SET NULL,
  "eventType" text NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);
