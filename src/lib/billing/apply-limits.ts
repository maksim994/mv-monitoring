import { db } from "@/db";
import { pages, projects, users } from "@/db/schema";
import { eq, and, lt, desc, asc, or, isNull, lte, inArray } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { getPlanLimitRow, type PlanKey } from "./plan";

/** After downgrade to free or on expiry: trim projects/pages and notification channels. */
export async function applyTierLimitsToUser(userId: string, tier: PlanKey) {
  const limits = await getPlanLimitRow(tier);

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: [asc(projects.createdAt)],
  });

  if (userProjects.length > limits.maxProjects) {
    const toDelete = userProjects.slice(limits.maxProjects);
    for (const p of toDelete) {
      await db.delete(projects).where(eq(projects.id, p.id));
    }
  }

  const remainingProjects = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
  });
  const projectIds = remainingProjects.map((p) => p.id);
  if (projectIds.length === 0) {
    await syncNotificationFlags(userId, limits);
    return;
  }

  const userPages = await db.query.pages.findMany({
    where: inArray(pages.projectId, projectIds),
    orderBy: [desc(pages.createdAt)],
  });

  if (userPages.length > limits.maxPagesPerUser) {
    const excess = userPages.slice(limits.maxPagesPerUser);
    for (const pg of excess) {
      await db
        .update(pages)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(pages.id, pg.id));
    }
  }

  const toFixInterval = await db
    .select({ id: pages.id, interval: pages.interval })
    .from(pages)
    .innerJoin(projects, eq(pages.projectId, projects.id))
    .where(and(eq(projects.userId, userId), lt(pages.interval, limits.minIntervalMinutes)));

  for (const row of toFixInterval) {
    await db
      .update(pages)
      .set({ interval: limits.minIntervalMinutes, updatedAt: new Date() })
      .where(eq(pages.id, row.id));
  }

  await syncNotificationFlags(userId, limits);
}

async function syncNotificationFlags(
  userId: string,
  limits: Awaited<ReturnType<typeof getPlanLimitRow>>
) {
  const patch: Partial<InferInsertModel<typeof users>> = {};
  if (!limits.allowTelegram) {
    patch.notifyTelegramEnabled = false;
  }
  if (!limits.allowWebhook) {
    patch.notifyWebhookEnabled = false;
    patch.notifyWebhookUrl = null;
  }
  if (Object.keys(patch).length > 0) {
    await db.update(users).set(patch).where(eq(users.id, userId));
  }
}

/** Mark expired PRO users as free and apply free-tier limits. */
export async function downgradeExpiredProUsers(): Promise<number> {
  const now = new Date();
  const expired = await db.query.users.findMany({
    where: and(eq(users.planTier, "pro"), or(isNull(users.proValidUntil), lte(users.proValidUntil, now))),
  });

  let n = 0;
  for (const u of expired) {
    await db
      .update(users)
      .set({
        planTier: "free",
        yookassaPaymentMethodId: null,
        subscriptionNextChargeAt: null,
      })
      .where(eq(users.id, u.id));
    await applyTierLimitsToUser(u.id, "free");
    n += 1;
  }
  return n;
}
