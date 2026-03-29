import { NextResponse } from "next/server";
import { getAdminSessionOrDeny } from "@/lib/admin";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";
import { applyTierLimitsToUser } from "@/lib/billing/apply-limits";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await getAdminSessionOrDeny();
  if ("response" in gate) return gate.response;

  const { id } = await params;
  const body = (await req.json()) as {
    banned?: boolean;
    planTier?: string;
    proValidUntil?: string | null;
    proAutoRenew?: boolean;
    role?: string;
  };

  const existing = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Partial<InferInsertModel<typeof users>> = {};

  if (typeof body.banned === "boolean") data.banned = body.banned;
  if (body.planTier === "free" || body.planTier === "pro") data.planTier = body.planTier;
  if (body.planTier === "free") {
    data.proValidUntil = null;
    data.subscriptionNextChargeAt = null;
    data.yookassaPaymentMethodId = null;
  }
  if (typeof body.proAutoRenew === "boolean") data.proAutoRenew = body.proAutoRenew;
  if (body.role === "user" || body.role === "admin") data.role = body.role;

  if (body.proValidUntil === null) {
    data.proValidUntil = null;
    data.subscriptionNextChargeAt = null;
  } else if (typeof body.proValidUntil === "string" && body.proValidUntil) {
    data.proValidUntil = new Date(body.proValidUntil);
    if (body.planTier !== "free") {
      data.planTier = "pro";
      data.subscriptionNextChargeAt = addDays(data.proValidUntil, -1);
    }
  }

  if (Object.keys(data).length > 0) {
    await db.update(users).set(data).where(eq(users.id, id));
  }

  const nextTier = body.planTier ?? existing.planTier;
  if (nextTier === "free") {
    await applyTierLimitsToUser(id, "free");
  }

  const updated = await db.query.users.findFirst({ where: eq(users.id, id) });
  return NextResponse.json({
    user: {
      id: updated?.id,
      email: updated?.email,
      name: updated?.name,
      planTier: updated?.planTier,
      proValidUntil: updated?.proValidUntil?.toISOString() ?? null,
      banned: updated?.banned,
      role: updated?.role,
    },
  });
}
