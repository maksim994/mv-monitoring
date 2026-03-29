import { db } from "@/db";
import { billingEvents, users } from "@/db/schema";
import { eq } from "drizzle-orm";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function extendUserProSubscription(
  userId: string,
  opts: { paymentMethodId?: string | null; periodDays?: number }
) {
  const periodDays = opts.periodDays ?? 30;
  const now = new Date();
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return;
  const base =
    u.proValidUntil && u.proValidUntil.getTime() > now.getTime() ? u.proValidUntil : now;
  const newUntil = addDays(base, periodDays);
  const pm = opts.paymentMethodId?.trim() || u.yookassaPaymentMethodId?.trim() || null;
  await db
    .update(users)
    .set({
      planTier: "pro",
      proValidUntil: newUntil,
      yookassaPaymentMethodId: pm,
      proAutoRenew: true,
      subscriptionNextChargeAt: addDays(newUntil, -1),
    })
    .where(eq(users.id, userId));
}

/** Idempotent: returns false if this payment was already applied. */
export async function recordPaymentAndExtendPro(params: {
  yookassaPaymentId: string;
  userId: string;
  eventType: string;
  paymentMethodId?: string | null;
}): Promise<boolean> {
  try {
    await db.insert(billingEvents).values({
      yookassaPaymentId: params.yookassaPaymentId,
      userId: params.userId,
      eventType: params.eventType,
    });
  } catch {
    return false;
  }
  await extendUserProSubscription(params.userId, {
    paymentMethodId: params.paymentMethodId,
  });
  return true;
}
