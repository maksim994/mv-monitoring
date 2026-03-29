import { db } from "@/db";
import { users, planLimits } from "@/db/schema";
import { and, eq, isNotNull, lte, gt, isNull, or } from "drizzle-orm";
import { downgradeExpiredProUsers } from "@/lib/billing/apply-limits";
import { getEffectivePlanKey } from "@/lib/billing/plan";
import { createRecurringProPayment, isYooKassaConfigured } from "./client";
import { recordPaymentAndExtendPro } from "./extend-subscription";

/** Run periodically from worker: expire PRO, attempt renewals. */
export async function runBillingMaintenance(): Promise<{ downgraded: number; renewalAttempts: number }> {
  const downgraded = await downgradeExpiredProUsers();

  let renewalAttempts = 0;
  if (!isYooKassaConfigured()) {
    return { downgraded, renewalAttempts };
  }

  const [proPriceRow] = await db.select().from(planLimits).where(eq(planLimits.planKey, "pro")).limit(1);
  if (!proPriceRow || proPriceRow.priceRubPerMonth <= 0) {
    return { downgraded, renewalAttempts };
  }

  const now = new Date();
  const due = await db.query.users.findMany({
    where: and(
      eq(users.planTier, "pro"),
      eq(users.proAutoRenew, true),
      isNotNull(users.yookassaPaymentMethodId),
      isNotNull(users.subscriptionNextChargeAt),
      lte(users.subscriptionNextChargeAt, now),
      or(isNull(users.proValidUntil), gt(users.proValidUntil, now))
    ),
  });

  for (const u of due) {
    if (getEffectivePlanKey(u) !== "pro") continue;
    const pm = u.yookassaPaymentMethodId?.trim();
    if (!pm) continue;
    try {
      const pay = await createRecurringProPayment({
        userId: u.id,
        paymentMethodId: pm,
        amountRub: proPriceRow.priceRubPerMonth,
        description: "PRO подписка (продление)",
      });
      renewalAttempts += 1;
      if (pay.status === "succeeded" && pay.id) {
        await recordPaymentAndExtendPro({
          yookassaPaymentId: pay.id,
          userId: u.id,
          eventType: "payment.succeeded",
          paymentMethodId: pay.payment_method?.id ?? pm,
        });
      }
    } catch (e) {
      console.error(`[billing] recurring payment failed for user ${u.id}:`, e);
    }
  }

  return { downgraded, renewalAttempts };
}
