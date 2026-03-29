import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { maskWebhookUrl } from "@/lib/notifications/mask-webhook";
import { isSmtpConfigured, isTelegramConfigured } from "@/lib/notifications/config";
import { getEffectivePlanKey, getPlanLimitRow } from "@/lib/billing/plan";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!user) return new NextResponse("Not found", { status: 404 });

  const tier = getEffectivePlanKey(user);
  const lim = await getPlanLimitRow(tier);

  return NextResponse.json({
    notifyEmailEnabled: user.notifyEmailEnabled,
    notifyWebhookEnabled: user.notifyWebhookEnabled,
    notifyTelegramEnabled: user.notifyTelegramEnabled,
    notifyFailureThreshold: user.notifyFailureThreshold,
    notifyRecoveryEnabled: user.notifyRecoveryEnabled,
    notifyReminderIntervalMinutes: user.notifyReminderIntervalMinutes ?? 0,
    webhookConfigured: Boolean(user.notifyWebhookUrl?.trim()),
    webhookUrlMasked: maskWebhookUrl(user.notifyWebhookUrl),
    smtpConfigured: isSmtpConfigured(),
    telegramBotConfigured: isTelegramConfigured(),
    telegramLinked: Boolean(user.telegramChatId?.trim()),
    planTier: tier,
    allowTelegram: lim.allowTelegram,
    allowWebhook: lim.allowWebhook,
  });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const existing = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });

  if (!existing) return new NextResponse("Not found", { status: 404 });

  const tier = getEffectivePlanKey(existing);
  const lim = await getPlanLimitRow(tier);

  const body = (await req.json()) as Record<string, unknown>;

  const updates: Partial<{
    notifyEmailEnabled: boolean;
    notifyWebhookEnabled: boolean;
    notifyWebhookUrl: string | null;
    notifyFailureThreshold: number;
    notifyRecoveryEnabled: boolean;
    notifyTelegramEnabled: boolean;
    notifyReminderIntervalMinutes: number | null;
  }> = {};

  if (typeof body.notifyEmailEnabled === "boolean") {
    updates.notifyEmailEnabled = body.notifyEmailEnabled;
  }
  if (typeof body.notifyWebhookEnabled === "boolean") {
    updates.notifyWebhookEnabled = body.notifyWebhookEnabled;
  }
  if (typeof body.notifyTelegramEnabled === "boolean") {
    updates.notifyTelegramEnabled = body.notifyTelegramEnabled;
  }
  if (typeof body.notifyWebhookUrl === "string") {
    const t = body.notifyWebhookUrl.trim();
    updates.notifyWebhookUrl = t ? t : null;
  }
  if (typeof body.notifyFailureThreshold === "number" && Number.isFinite(body.notifyFailureThreshold)) {
    updates.notifyFailureThreshold = Math.min(
      10,
      Math.max(1, Math.floor(body.notifyFailureThreshold))
    );
  }
  if (typeof body.notifyRecoveryEnabled === "boolean") {
    updates.notifyRecoveryEnabled = body.notifyRecoveryEnabled;
  }
  if (typeof body.notifyReminderIntervalMinutes === "number" && Number.isFinite(body.notifyReminderIntervalMinutes)) {
    const v = Math.floor(body.notifyReminderIntervalMinutes);
    updates.notifyReminderIntervalMinutes = v <= 0 ? null : Math.min(10080, v);
  }

  if (!lim.allowTelegram) {
    updates.notifyTelegramEnabled = false;
  }
  if (!lim.allowWebhook) {
    updates.notifyWebhookEnabled = false;
    updates.notifyWebhookUrl = null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({
    notifyEmailEnabled: updated.notifyEmailEnabled,
    notifyWebhookEnabled: updated.notifyWebhookEnabled,
    notifyTelegramEnabled: updated.notifyTelegramEnabled,
    notifyFailureThreshold: updated.notifyFailureThreshold,
    notifyRecoveryEnabled: updated.notifyRecoveryEnabled,
    notifyReminderIntervalMinutes: updated.notifyReminderIntervalMinutes ?? 0,
    webhookConfigured: Boolean(updated.notifyWebhookUrl?.trim()),
    webhookUrlMasked: maskWebhookUrl(updated.notifyWebhookUrl),
    smtpConfigured: isSmtpConfigured(),
    telegramBotConfigured: isTelegramConfigured(),
    telegramLinked: Boolean(updated.telegramChatId?.trim()),
    planTier: tier,
    allowTelegram: lim.allowTelegram,
    allowWebhook: lim.allowWebhook,
  });
}
