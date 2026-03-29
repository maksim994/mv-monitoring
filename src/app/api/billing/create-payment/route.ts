import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users, planLimits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createInitialProPayment, isYooKassaConfigured } from "@/lib/yookassa/client";
import { getEffectivePlanKey } from "@/lib/billing/plan";

function appBaseUrl() {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!u) return null;
  return u.replace(/\/$/, "");
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  if (!isYooKassaConfigured()) {
    return NextResponse.json({ error: "PAYMENTS_NOT_CONFIGURED" }, { status: 503 });
  }

  const base = appBaseUrl();
  if (!base) {
    return NextResponse.json({ error: "APP_URL_NOT_SET" }, { status: 500 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!user?.email) {
    return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });
  }

  const [proRow] = await db.select().from(planLimits).where(eq(planLimits.planKey, "pro")).limit(1);
  if (!proRow || proRow.priceRubPerMonth <= 0) {
    return NextResponse.json({ error: "PRICE_NOT_SET" }, { status: 500 });
  }

  const effective = getEffectivePlanKey(user);
  if (effective === "pro") {
    return NextResponse.json({ error: "ALREADY_PRO" }, { status: 400 });
  }

  try {
    const payment = await createInitialProPayment({
      userId: user.id,
      amountRub: proRow.priceRubPerMonth,
      returnUrl: `${base}/dashboard/settings?billing=return`,
      description: `PRO подписка 1 мес — ${proRow.priceRubPerMonth} ₽`,
    });
    const url = payment.confirmation?.confirmation_url;
    if (!url) {
      return NextResponse.json({ error: "NO_CONFIRMATION_URL" }, { status: 502 });
    }
    return NextResponse.json({ confirmationUrl: url, paymentId: payment.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "YOOKASSA_ERROR" }, { status: 502 });
  }
}
