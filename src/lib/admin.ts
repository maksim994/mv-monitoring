import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { authOptions } from "@/lib/auth";

export async function isUserAdmin(userId: string, email: string | null | undefined): Promise<boolean> {
  const u = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!u) return false;
  if (u.role === "admin") return true;
  const allow =
    process.env.ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  if (email && allow.includes(email.toLowerCase())) return true;
  return false;
}

export async function getAdminSessionOrDeny(): Promise<
  { session: Session } | { response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const ok = await isUserAdmin(session.user.id, session.user.email);
  if (!ok) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
