import { NextResponse } from "next/server";
import { recordPaymentAndExtendPro } from "@/lib/yookassa/extend-subscription";

type YooNotification = {
  type?: string;
  event?: string;
  object?: {
    id?: string;
    status?: string;
    metadata?: { userId?: string };
    payment_method?: { id?: string };
  };
};

export async function POST(req: Request) {
  const secret = process.env.YOOKASSA_WEBHOOK_SECRET?.trim();
  if (secret) {
    const q = new URL(req.url).searchParams.get("secret");
    if (q !== secret) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  let body: YooNotification;
  try {
    body = (await req.json()) as YooNotification;
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }

  if (body.event !== "payment.succeeded" || !body.object?.id) {
    return NextResponse.json({ ok: true });
  }

  const userId = body.object.metadata?.userId?.trim();
  if (!userId) {
    console.warn("[yookassa webhook] missing userId metadata", body.object.id);
    return NextResponse.json({ ok: true });
  }

  const pmId = body.object.payment_method?.id ?? null;
  const applied = await recordPaymentAndExtendPro({
    yookassaPaymentId: body.object.id,
    userId,
    eventType: body.event,
    paymentMethodId: pmId,
  });

  if (!applied) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  return NextResponse.json({ ok: true });
}
