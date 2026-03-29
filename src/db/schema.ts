import { pgTable, text, timestamp, uuid, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  password: text("password"), // For credentials auth
  telegramChatId: text("telegramChatId"),
  telegramLinkToken: text("telegramLinkToken"),
  telegramLinkExpires: timestamp("telegramLinkExpires", { mode: "date" }),
  notifyEmailEnabled: boolean("notifyEmailEnabled").notNull().default(true),
  notifyWebhookEnabled: boolean("notifyWebhookEnabled").notNull().default(false),
  notifyWebhookUrl: text("notifyWebhookUrl"),
  notifyFailureThreshold: integer("notifyFailureThreshold").notNull().default(2),
  notifyRecoveryEnabled: boolean("notifyRecoveryEnabled").notNull().default(true),
  notifyTelegramEnabled: boolean("notifyTelegramEnabled").notNull().default(true),
  notifyReminderIntervalMinutes: integer("notifyReminderIntervalMinutes"),
  planTier: text("planTier").notNull().default("free"),
  proValidUntil: timestamp("proValidUntil", { mode: "date" }),
  proAutoRenew: boolean("proAutoRenew").notNull().default(true),
  yookassaPaymentMethodId: text("yookassaPaymentMethodId"),
  subscriptionNextChargeAt: timestamp("subscriptionNextChargeAt", { mode: "date" }),
  banned: boolean("banned").notNull().default(false),
  role: text("role").notNull().default("user"),
  personalDataConsentAt: timestamp("personalDataConsentAt", { mode: "date" }),
});

export const planLimits = pgTable("plan_limit", {
  planKey: text("planKey").primaryKey(),
  maxProjects: integer("maxProjects").notNull(),
  maxPagesPerUser: integer("maxPagesPerUser").notNull(),
  minIntervalMinutes: integer("minIntervalMinutes").notNull(),
  allowTelegram: boolean("allowTelegram").notNull().default(false),
  allowWebhook: boolean("allowWebhook").notNull().default(false),
  priceRubPerMonth: integer("priceRubPerMonth").notNull().default(0),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const siteMarketing = pgTable("site_marketing", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export const billingEvents = pgTable("billing_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  yookassaPaymentId: text("yookassaPaymentId").notNull().unique(),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  eventType: text("eventType").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable("account", {
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const projects = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  domain: text("domain"),
  domainVerificationToken: text("domainVerificationToken"),
  domainVerifiedAt: timestamp("domainVerifiedAt", { mode: "date" }),
  /** Публичная страница статуса: /status/[statusSlug] */
  statusSlug: text("statusSlug").unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const pages = pgTable("page", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  checkType: text("checkType").notNull().default("http"),
  checkConfig: jsonb("checkConfig")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
  interval: integer("interval").notNull().default(5), // in minutes
  isActive: boolean("isActive").notNull().default(true),
  consecutiveFailures: integer("consecutiveFailures").notNull().default(0),
  downNotified: boolean("downNotified").notNull().default(false),
  lastDownReminderSentAt: timestamp("lastDownReminderSentAt", { mode: "date" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const apiKeys = pgTable("api_key", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  tokenHash: text("tokenHash").notNull().unique(),
  tokenPrefix: text("tokenPrefix").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  lastUsedAt: timestamp("lastUsedAt", { mode: "date" }),
});

export const pingLogs = pgTable("pingLog", {
  id: uuid("id").primaryKey().defaultRandom(),
  pageId: uuid("pageId")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  status: integer("status").notNull(),
  responseTime: integer("responseTime").notNull(), // in ms
  isSuccess: boolean("isSuccess").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notificationLogs = pgTable("notificationLog", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("projectId")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  pageId: uuid("pageId")
    .notNull()
    .references(() => pages.id, { onDelete: "cascade" }),
  channel: text("channel").notNull(),
  event: text("event").notNull(),
  detail: text("detail"),
  success: boolean("success").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
