import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateApiKeyToken } from "@/lib/api-key-auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const rows = await db.query.apiKeys.findMany({
    where: eq(apiKeys.userId, session.user.id),
    orderBy: [desc(apiKeys.createdAt)],
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      tokenPrefix: r.tokenPrefix,
      createdAt: r.createdAt?.toISOString() ?? null,
      lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    }))
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 128) {
    return NextResponse.json({ error: "Укажите название ключа (до 128 символов)" }, { status: 400 });
  }

  const { full, tokenPrefix, hash } = generateApiKeyToken();

  const [row] = await db
    .insert(apiKeys)
    .values({
      userId: session.user.id,
      name,
      tokenHash: hash,
      tokenPrefix,
    })
    .returning();

  if (!row) {
    return NextResponse.json({ error: "Не удалось создать ключ" }, { status: 500 });
  }

  return NextResponse.json({
    id: row.id,
    name: row.name,
    token: full,
    tokenPrefix: row.tokenPrefix,
    createdAt: row.createdAt?.toISOString() ?? null,
    message: "Сохраните токен сейчас — больше он не будет показан.",
  });
}
