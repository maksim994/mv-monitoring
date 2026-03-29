const API = "https://api.yookassa.ru/v3";

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID?.trim();
  const secret = process.env.YOOKASSA_SECRET_KEY?.trim();
  if (!shopId || !secret) {
    throw new Error("YOOKASSA_SHOP_ID and YOOKASSA_SECRET_KEY are required");
  }
  const token = Buffer.from(`${shopId}:${secret}`).toString("base64");
  return `Basic ${token}`;
}

export function isYooKassaConfigured(): boolean {
  return Boolean(process.env.YOOKASSA_SHOP_ID?.trim() && process.env.YOOKASSA_SECRET_KEY?.trim());
}

export type YooPaymentResponse = {
  id: string;
  status: string;
  confirmation?: { confirmation_url?: string };
  payment_method?: { id?: string; saved?: boolean };
};

export async function createInitialProPayment(params: {
  userId: string;
  amountRub: number;
  returnUrl: string;
  description: string;
}): Promise<YooPaymentResponse> {
  const value = Number(params.amountRub).toFixed(2);
  const idempotenceKey = crypto.randomUUID();
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value, currency: "RUB" },
      capture: true,
      save_payment_method: true,
      confirmation: { type: "redirect", return_url: params.returnUrl },
      description: params.description,
      metadata: { userId: params.userId },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as YooPaymentResponse & { type?: string; description?: string };
  if (!res.ok) {
    throw new Error(`YooKassa create payment failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export async function createRecurringProPayment(params: {
  userId: string;
  paymentMethodId: string;
  amountRub: number;
  description: string;
}): Promise<YooPaymentResponse> {
  const value = Number(params.amountRub).toFixed(2);
  const idempotenceKey = `renew-${params.userId}-${new Date().toISOString().slice(0, 10)}`;
  const res = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify({
      amount: { value, currency: "RUB" },
      capture: true,
      payment_method_id: params.paymentMethodId,
      description: params.description,
      metadata: { userId: params.userId, recurring: "1" },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as YooPaymentResponse & { type?: string };
  if (!res.ok) {
    throw new Error(`YooKassa recurring payment failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}
