import nodemailer from "nodemailer";
import { db } from "@/db";
import { notificationLogs, projects, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  buildEmailCopy,
  buildNotificationPayload,
  buildTelegramPlainText,
} from "./build-payload";
import { isSmtpConfigured, isTelegramConfigured } from "./config";
import { getEffectivePlanKey, getPlanLimitRow } from "@/lib/billing/plan";

export type NotificationJobData = {
  projectId: string;
  pageId: string;
  pageName: string;
  pageUrl: string;
  projectName: string;
  event: "down" | "up" | "down_reminder";
  status: number;
  responseTime: number;
  errorMessage: string | null;
};

async function logNotification(
  projectId: string,
  pageId: string,
  channel: string,
  event: string,
  success: boolean,
  detail?: string | null
) {
  await db.insert(notificationLogs).values({
    projectId,
    pageId,
    channel,
    event,
    detail: detail ?? null,
    success,
  });
}

async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.description || `HTTP ${res.status}`);
  }
}

export async function processNotificationJob(data: NotificationJobData): Promise<void> {
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, data.projectId),
  });
  if (!project) return;

  const owner = await db.query.users.findFirst({
    where: eq(users.id, project.userId),
  });
  if (!owner) return;

  const ownerEmail = owner.email ?? null;
  const ownerTelegramChatId = owner.telegramChatId?.trim() ?? null;

  const effectivePlan = getEffectivePlanKey(owner);
  const planLimitsRow = await getPlanLimitRow(effectivePlan);

  const checkedAtIso = new Date().toISOString();
  const payload = buildNotificationPayload({
    event: data.event,
    projectName: data.projectName,
    pageName: data.pageName,
    pageUrl: data.pageUrl,
    status: data.status,
    responseTimeMs: data.responseTime,
    errorMessage: data.errorMessage,
    checkedAtIso,
  });
  const { subject, text } = buildEmailCopy({
    event: data.event,
    projectName: data.projectName,
    pageName: data.pageName,
    pageUrl: data.pageUrl,
    status: data.status,
    responseTimeMs: data.responseTime,
    errorMessage: data.errorMessage,
  });
  const tgText = buildTelegramPlainText({
    event: data.event,
    projectName: data.projectName,
    pageName: data.pageName,
    pageUrl: data.pageUrl,
    status: data.status,
    responseTimeMs: data.responseTime,
    errorMessage: data.errorMessage,
  });

  if (owner.notifyEmailEnabled && ownerEmail?.trim() && isSmtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS || "",
            }
          : undefined,
      });
      await transporter.sendMail({
        from: process.env.NOTIFICATION_FROM_EMAIL,
        to: ownerEmail.trim(),
        subject,
        text,
      });
      await logNotification(data.projectId, data.pageId, "email", data.event, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await logNotification(data.projectId, data.pageId, "email", data.event, false, msg);
      console.error("Notification email failed:", msg);
    }
  }

  if (
    planLimitsRow.allowTelegram &&
    owner.notifyTelegramEnabled &&
    ownerTelegramChatId &&
    isTelegramConfigured()
  ) {
    try {
      await sendTelegramMessage(ownerTelegramChatId, tgText);
      await logNotification(data.projectId, data.pageId, "telegram", data.event, true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await logNotification(data.projectId, data.pageId, "telegram", data.event, false, msg);
      console.error("Notification telegram failed:", msg);
    }
  }

  const webhookUrl = owner.notifyWebhookUrl?.trim();
  if (planLimitsRow.allowWebhook && owner.notifyWebhookEnabled && webhookUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MVMonitor-Notifications/1.0",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        await logNotification(
          data.projectId,
          data.pageId,
          "webhook",
          data.event,
          false,
          `HTTP ${res.status} ${body.slice(0, 200)}`
        );
      } else {
        await logNotification(data.projectId, data.pageId, "webhook", data.event, true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await logNotification(data.projectId, data.pageId, "webhook", data.event, false, msg);
      console.error("Notification webhook failed:", msg);
    }
  }
}
