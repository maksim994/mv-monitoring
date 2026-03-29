import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (secret) {
    const header = req.headers.get("x-telegram-bot-api-secret-token");
    if (header !== secret) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const update = body as {
    message?: { text?: string; chat?: { id: number } };
    edited_message?: { text?: string; chat?: { id: number } };
  };
  const msg = update.message ?? update.edited_message;
  const text = msg?.text;
  const chatId = msg?.chat?.id;

  if (!text || typeof text !== "string" || chatId == null) {
    return NextResponse.json({ ok: true });
  }

  const parts = text.trim().split(/\s+/);
  if (parts[0] !== "/start") {
    return NextResponse.json({ ok: true });
  }

  const linkToken = parts[1];
  if (!linkToken) {
    return NextResponse.json({ ok: true });
  }

  const now = new Date();
  const [linked] = await db
    .update(users)
    .set({
      telegramChatId: String(chatId),
      telegramLinkToken: null,
      telegramLinkExpires: null,
    })
    .where(
      and(
        eq(users.telegramLinkToken, linkToken),
        gt(users.telegramLinkExpires, now)
      )
    )
    .returning({ id: users.id });

  if (linked?.id && process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    try {
      await fetch(
        `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN.trim()}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Аккаунт MV Monitor привязан. Вы будете получать уведомления о проверках здесь.",
          }),
        }
      );
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ ok: true });
}
