import { NextResponse } from "next/server";
import { getAdminSessionOrDeny } from "@/lib/admin";
import { db } from "@/db";
import { planLimits } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const gate = await getAdminSessionOrDeny();
  if ("response" in gate) return gate.response;

  const rows = await db.select().from(planLimits);
  return NextResponse.json({ plans: rows });
}

export async function PATCH(req: Request) {
  const gate = await getAdminSessionOrDeny();
  if ("response" in gate) return gate.response;

  const body = (await req.json()) as {
    free?: Partial<{
      maxProjects: number;
      maxPagesPerUser: number;
      minIntervalMinutes: number;
      allowTelegram: boolean;
      allowWebhook: boolean;
    }>;
    pro?: Partial<{
      maxProjects: number;
      maxPagesPerUser: number;
      minIntervalMinutes: number;
      allowTelegram: boolean;
      allowWebhook: boolean;
      priceRubPerMonth: number;
    }>;
  };

  const patchRow = async (
    key: "free" | "pro",
    patch: Record<string, unknown>
  ) => {
    const allowed = [
      "maxProjects",
      "maxPagesPerUser",
      "minIntervalMinutes",
      "allowTelegram",
      "allowWebhook",
      ...(key === "pro" ? (["priceRubPerMonth"] as const) : []),
    ] as const;
    const data: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of allowed) {
      if (patch[k] !== undefined) data[k] = patch[k];
    }
    if (Object.keys(data).length <= 1) return;
    await db.update(planLimits).set(data as never).where(eq(planLimits.planKey, key));
  };

  if (body.free) await patchRow("free", body.free as Record<string, unknown>);
  if (body.pro) await patchRow("pro", body.pro as Record<string, unknown>);

  const rows = await db.select().from(planLimits);
  return NextResponse.json({ plans: rows });
}
