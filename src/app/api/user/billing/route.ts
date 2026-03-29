import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEffectivePlanKey, getPlanLimitsMap } from "@/lib/billing/plan";
import { isYooKassaConfigured } from "@/lib/yookassa/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user) return new NextResponse("Not found", { status: 404 });

  const limits = await getPlanLimitsMap();
  const effective = getEffectivePlanKey(user);

  return NextResponse.json({
    planTier: user.planTier,
    effectivePlan: effective,
    proValidUntil: user.proValidUntil?.toISOString() ?? null,
    proAutoRenew: user.proAutoRenew,
    subscriptionNextChargeAt: user.subscriptionNextChargeAt?.toISOString() ?? null,
    yookassaConfigured: isYooKassaConfigured(),
    limits: limits[effective],
    proPriceRubPerMonth: limits.pro.priceRubPerMonth,
  });
}
