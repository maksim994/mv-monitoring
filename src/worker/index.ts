import "./load-env";
import { Worker, Queue } from "bullmq";
import { db } from "../db";
import { pages, pingLogs, projects, users } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  canSendMonitoringNotifications,
  isSmtpConfigured,
  isTelegramConfigured,
} from "../lib/notifications/config";
import {
  processNotificationJob,
  type NotificationJobData,
} from "../lib/notifications/process-job";
import { getEffectivePlanKey, getPlanLimitRow } from "../lib/billing/plan";
import { downgradeExpiredProUsers } from "../lib/billing/apply-limits";
import { runBillingMaintenance } from "../lib/yookassa/subscription-jobs";
import { runPageCheck } from "../lib/page-check";

const connection = {
  url: process.env.REDIS_URL || "redis://localhost:6381",
  maxRetriesPerRequest: null,
};

export const pingQueue = new Queue("pingQueue", { connection });
export const notificationQueue = new Queue("notificationQueue", { connection });

const worker = new Worker(
  "pingQueue",
  async (job) => {
    const { pageId } = job.data as { pageId: string; url?: string };

    const [ctx] = await db
      .select({
        page: pages,
        project: projects,
        ownerEmail: users.email,
        ownerTelegramChatId: users.telegramChatId,
        ownerNotifyEmailEnabled: users.notifyEmailEnabled,
        ownerNotifyWebhookEnabled: users.notifyWebhookEnabled,
        ownerNotifyWebhookUrl: users.notifyWebhookUrl,
        ownerNotifyFailureThreshold: users.notifyFailureThreshold,
        ownerNotifyRecoveryEnabled: users.notifyRecoveryEnabled,
        ownerNotifyTelegramEnabled: users.notifyTelegramEnabled,
        ownerNotifyReminderIntervalMinutes: users.notifyReminderIntervalMinutes,
        ownerBanned: users.banned,
        ownerPlanTier: users.planTier,
        ownerProValidUntil: users.proValidUntil,
      })
      .from(pages)
      .innerJoin(projects, eq(pages.projectId, projects.id))
      .innerJoin(users, eq(projects.userId, users.id))
      .where(eq(pages.id, pageId))
      .limit(1);

    if (!ctx) {
      console.log(`Ping job ${pageId}: page not found, skipping`);
      return;
    }

    const url = ctx.page.url;
    const { status, responseTime, isSuccess, errorMessage } = await runPageCheck({
      url,
      checkType: ctx.page.checkType,
      checkConfig: ctx.page.checkConfig,
    });

    await db.insert(pingLogs).values({
      pageId,
      status,
      responseTime,
      isSuccess,
      errorMessage,
    });

    const effectivePlan = getEffectivePlanKey({
      planTier: ctx.ownerPlanTier,
      proValidUntil: ctx.ownerProValidUntil,
    });
    const planRow = await getPlanLimitRow(effectivePlan);
    const planCaps = {
      allowTelegram: planRow.allowTelegram,
      allowWebhook: planRow.allowWebhook,
    };

    const threshold = Math.max(1, ctx.ownerNotifyFailureThreshold);
    const projectName = ctx.project.name;
    const pageName = ctx.page.name;
    const ownerCtx = {
      email: ctx.ownerEmail,
      telegramChatId: ctx.ownerTelegramChatId,
    };
    const notifyPrefs = {
      notifyEmailEnabled: ctx.ownerNotifyEmailEnabled,
      notifyWebhookEnabled: ctx.ownerNotifyWebhookEnabled,
      notifyWebhookUrl: ctx.ownerNotifyWebhookUrl,
      notifyTelegramEnabled: ctx.ownerNotifyTelegramEnabled,
    };

    const enqueue = (event: "down" | "up" | "down_reminder") => {
      if (ctx.ownerBanned) return Promise.resolve(undefined);
      const payload: NotificationJobData = {
        projectId: ctx.project.id,
        pageId: ctx.page.id,
        pageName,
        pageUrl: ctx.page.url,
        projectName,
        event,
        status,
        responseTime,
        errorMessage,
      };
      return notificationQueue.add("notify", payload);
    };

    if (isSuccess) {
      if (
        ctx.page.downNotified &&
        ctx.ownerNotifyRecoveryEnabled &&
        !ctx.ownerBanned &&
        canSendMonitoringNotifications(notifyPrefs, ownerCtx, planCaps)
      ) {
        await enqueue("up");
      }
      await db
        .update(pages)
        .set({
          consecutiveFailures: 0,
          downNotified: false,
          lastDownReminderSentAt: null,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, pageId));
    } else {
      const newFailures = ctx.page.consecutiveFailures + 1;
      let newDownNotified = ctx.page.downNotified;
      let lastReminder = ctx.page.lastDownReminderSentAt ?? null;
      const now = new Date();

      if (newFailures >= threshold && !ctx.page.downNotified) {
        if (canSendMonitoringNotifications(notifyPrefs, ownerCtx, planCaps)) {
          await enqueue("down");
          console.log(`[notify] enqueued DOWN for page ${pageId} (${pageName})`);
        } else {
          console.warn(
            `[notify] skip DOWN for page ${pageId}: no delivery channel (enable Telegram/email/webhook + SMTP/link URL, or set TELEGRAM_BOT_TOKEN in this worker process)`
          );
        }
        newDownNotified = true;
        lastReminder = now;
      } else if (
        ctx.page.downNotified &&
        newFailures >= threshold
      ) {
        const intervalMin = ctx.ownerNotifyReminderIntervalMinutes;
        if (intervalMin && intervalMin > 0 && lastReminder) {
          const elapsedMs = now.getTime() - lastReminder.getTime();
          if (elapsedMs >= intervalMin * 60 * 1000) {
            if (canSendMonitoringNotifications(notifyPrefs, ownerCtx, planCaps)) {
              await enqueue("down_reminder");
              console.log(`[notify] enqueued DOWN_REMINDER for page ${pageId}`);
            } else {
              console.warn(`[notify] skip DOWN_REMINDER for page ${pageId}: no delivery channel`);
            }
            lastReminder = now;
          }
        }
      }

      await db
        .update(pages)
        .set({
          consecutiveFailures: newFailures,
          downNotified: newDownNotified,
          lastDownReminderSentAt: lastReminder,
          updatedAt: new Date(),
        })
        .where(eq(pages.id, pageId));
    }

    console.log(`Pinged ${ctx.page.url} - Status: ${status} - Time: ${responseTime}ms`);
  },
  { connection }
);

const notifyWorker = new Worker(
  "notificationQueue",
  async (job) => {
    await processNotificationJob(job.data as NotificationJobData);
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

notifyWorker.on("failed", (job, err) => {
  console.error(`Notify job ${job?.id} failed:`, err);
});

setInterval(async () => {
  try {
    const rows = await db
      .select({
        pageId: pages.id,
        pageUrl: pages.url,
        pageInterval: pages.interval,
        projectDomain: projects.domain,
        projectDomainVerifiedAt: projects.domainVerifiedAt,
      })
      .from(pages)
      .innerJoin(projects, eq(pages.projectId, projects.id))
      .where(eq(pages.isActive, true));

    const now = new Date();
    const minutes = now.getMinutes();

    for (const row of rows) {
      if (row.projectDomain && !row.projectDomainVerifiedAt) {
        continue;
      }
      if (minutes % row.pageInterval === 0) {
        await pingQueue.add("ping", { pageId: row.pageId });
      }
    }
  } catch (error) {
    console.error("Scheduler error:", error);
  }
}, 60000);

async function tickBilling() {
  try {
    const r = await runBillingMaintenance();
    if (r.downgraded > 0 || r.renewalAttempts > 0) {
      console.log(`[billing] downgraded=${r.downgraded} renewalAttempts=${r.renewalAttempts}`);
    }
  } catch (e) {
    console.error("[billing] maintenance error:", e);
  }
}

void tickBilling();
setInterval(() => void tickBilling(), 60 * 60 * 1000);

console.log("Worker started (ping + notifications)...");
console.log(
  `[worker] env: TELEGRAM_BOT_TOKEN ${isTelegramConfigured() ? "present" : "MISSING"}, SMTP ${isSmtpConfigured() ? "configured" : "not configured"}, REDIS_URL ${process.env.REDIS_URL ? "set" : "default localhost:6381"}`
);
