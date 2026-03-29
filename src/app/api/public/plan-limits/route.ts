import { NextResponse } from "next/server";
import { getPlanLimitsMap } from "@/lib/billing/plan";
import { db } from "@/db";
import { siteMarketing } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function GET() {
  try {
    const limits = await getPlanLimitsMap();
    const keys = ["home_hero_title", "home_hero_subtitle", "pricing_intro"] as const;
    const rows = await db.query.siteMarketing.findMany({
      where: inArray(siteMarketing.key, [...keys]),
    });
    const marketing: Record<string, string> = {};
    for (const k of keys) marketing[k] = "";
    for (const r of rows) marketing[r.key] = r.value;

    return NextResponse.json({
      free: {
        maxProjects: limits.free.maxProjects,
        maxPagesPerUser: limits.free.maxPagesPerUser,
        minIntervalMinutes: limits.free.minIntervalMinutes,
        allowTelegram: limits.free.allowTelegram,
        allowWebhook: limits.free.allowWebhook,
      },
      pro: {
        maxProjects: limits.pro.maxProjects,
        maxPagesPerUser: limits.pro.maxPagesPerUser,
        minIntervalMinutes: limits.pro.minIntervalMinutes,
        allowTelegram: limits.pro.allowTelegram,
        allowWebhook: limits.pro.allowWebhook,
        priceRubPerMonth: limits.pro.priceRubPerMonth,
      },
      marketing,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
