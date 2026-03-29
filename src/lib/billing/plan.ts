import { db } from "@/db";
import { planLimits, pages, projects, users } from "@/db/schema";
import { eq, lt, sql } from "drizzle-orm";
import type { users as usersTable } from "@/db/schema";

export type PlanKey = "free" | "pro";

export type UserRow = typeof usersTable.$inferSelect;

/** Matches drizzle/0004_billing_admin_marketing.sql — used when DB was created without seed INSERT. */
const DEFAULT_PLAN_ROWS: Record<
  PlanKey,
  {
    maxProjects: number;
    maxPagesPerUser: number;
    minIntervalMinutes: number;
    allowTelegram: boolean;
    allowWebhook: boolean;
    priceRubPerMonth: number;
  }
> = {
  free: {
    maxProjects: 1,
    maxPagesPerUser: 5,
    minIntervalMinutes: 60,
    allowTelegram: false,
    allowWebhook: false,
    priceRubPerMonth: 0,
  },
  pro: {
    maxProjects: 20,
    maxPagesPerUser: 200,
    minIntervalMinutes: 5,
    allowTelegram: true,
    allowWebhook: true,
    priceRubPerMonth: 299,
  },
};

let planSeedPromise: Promise<void> | null = null;

/** Idempotent: inserts free/pro rows if missing (e.g. drizzle push without SQL seed). */
export function ensurePlanLimitsSeeded(): Promise<void> {
  if (!planSeedPromise) {
    planSeedPromise = (async () => {
      for (const key of ["free", "pro"] as const) {
        const d = DEFAULT_PLAN_ROWS[key];
        await db
          .insert(planLimits)
          .values({
            planKey: key,
            maxProjects: d.maxProjects,
            maxPagesPerUser: d.maxPagesPerUser,
            minIntervalMinutes: d.minIntervalMinutes,
            allowTelegram: d.allowTelegram,
            allowWebhook: d.allowWebhook,
            priceRubPerMonth: d.priceRubPerMonth,
            updatedAt: new Date(),
          })
          .onConflictDoNothing({ target: planLimits.planKey });
      }
    })().catch((e) => {
      planSeedPromise = null;
      throw e;
    });
  }
  return planSeedPromise;
}

export function getEffectivePlanKey(user: Pick<UserRow, "planTier" | "proValidUntil">): PlanKey {
  if (user.planTier !== "pro") return "free";
  if (!user.proValidUntil) return "free";
  return user.proValidUntil.getTime() > Date.now() ? "pro" : "free";
}

export async function getPlanLimitRow(planKey: PlanKey) {
  await ensurePlanLimitsSeeded();
  const row = await db.query.planLimits.findFirst({
    where: eq(planLimits.planKey, planKey),
  });
  if (!row) {
    throw new Error(`Missing plan_limit row for ${planKey}`);
  }
  return row;
}

export async function getPlanLimitsMap(): Promise<Record<PlanKey, NonNullable<Awaited<ReturnType<typeof getPlanLimitRow>>>>> {
  await ensurePlanLimitsSeeded();
  const rows = await db.select().from(planLimits);
  const map = {} as Record<string, (typeof rows)[0]>;
  for (const r of rows) map[r.planKey] = r;
  if (!map.free || !map.pro) {
    throw new Error("plan_limit must define free and pro");
  }
  return map as Record<PlanKey, (typeof rows)[0]>;
}

export async function countUserProjects(userId: string) {
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.userId, userId));
  return r?.c ?? 0;
}

export async function countUserPages(userId: string) {
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(pages)
    .innerJoin(projects, eq(pages.projectId, projects.id))
    .where(eq(projects.userId, userId));
  return r?.c ?? 0;
}

export async function enforceIntervalForPage(
  userId: string,
  interval: number,
  effectivePlan: PlanKey
): Promise<number> {
  const limits = await getPlanLimitRow(effectivePlan);
  const min = limits.minIntervalMinutes;
  const stepped = Math.max(min, Math.floor(interval) || min);
  return stepped;
}

export async function userMayEnableTelegram(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return false;
  const tier = getEffectivePlanKey(user);
  const limits = await getPlanLimitRow(tier);
  return limits.allowTelegram;
}

export async function userMayEnableWebhook(userId: string): Promise<boolean> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return false;
  const tier = getEffectivePlanKey(user);
  const limits = await getPlanLimitRow(tier);
  return limits.allowWebhook;
}
