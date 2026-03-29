import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const botUser = process.env.TELEGRAM_BOT_USERNAME?.trim().replace(/^@/, "");
  if (!botUser || !process.env.TELEGRAM_BOT_TOKEN?.trim()) {
    return NextResponse.json(
      { error: "TELEGRAM_NOT_CONFIGURED", message: "Бот не настроен на сервере." },
      { status: 503 }
    );
  }

  const token = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 30 * 60 * 1000);

  await db
    .update(users)
    .set({
      telegramLinkToken: token,
      telegramLinkExpires: expires,
    })
    .where(eq(users.id, session.user.id));

  const linkUrl = `https://t.me/${botUser}?start=${token}`;

  return NextResponse.json({ linkUrl, expiresAt: expires.toISOString() });
}
