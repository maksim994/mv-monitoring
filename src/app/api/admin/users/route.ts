import { NextResponse } from "next/server";
import { getAdminSessionOrDeny } from "@/lib/admin";
import { db } from "@/db";
import { users } from "@/db/schema";
import { desc, eq, ilike, or } from "drizzle-orm";

export async function GET(req: Request) {
  const gate = await getAdminSessionOrDeny();
  if ("response" in gate) return gate.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const list = await db.query.users.findMany({
    where: q
      ? or(ilike(users.email, `%${q}%`), ilike(users.name, `%${q}%`), eq(users.id, q))
      : undefined,
    orderBy: [desc(users.id)],
    limit: 100,
  });

  const withDates = list.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    planTier: u.planTier,
    proValidUntil: u.proValidUntil?.toISOString() ?? null,
    banned: u.banned,
    role: u.role,
  }));

  return NextResponse.json({ users: withDates });
}
