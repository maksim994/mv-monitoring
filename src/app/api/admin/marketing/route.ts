import { NextResponse } from "next/server";
import { getAdminSessionOrDeny } from "@/lib/admin";
import { db } from "@/db";
import { siteMarketing } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const gate = await getAdminSessionOrDeny();
  if ("response" in gate) return gate.response;

  const rows = await db.select().from(siteMarketing);
  return NextResponse.json({ items: rows });
}

export async function PATCH(req: Request) {
  const gate = await getAdminSessionOrDeny();
  if ("response" in gate) return gate.response;

  const body = (await req.json()) as { items?: { key: string; value: string }[] };

  if (!body.items?.length) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  for (const it of body.items) {
    if (!it.key?.trim()) continue;
    const key = it.key.trim();
    const value = it.value ?? "";
    const [u] = await db
      .update(siteMarketing)
      .set({ value, updatedAt: new Date() })
      .where(eq(siteMarketing.key, key))
      .returning({ key: siteMarketing.key });
    if (!u) {
      await db.insert(siteMarketing).values({ key, value, updatedAt: new Date() });
    }
  }

  const rows = await db.select().from(siteMarketing);
  return NextResponse.json({ items: rows });
}
