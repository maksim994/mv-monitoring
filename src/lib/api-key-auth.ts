import { createHash, randomBytes } from "node:crypto";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { eq } from "drizzle-orm";

export function hashApiKeyToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateApiKeyToken(): { full: string; tokenPrefix: string; hash: string } {
  const secret = randomBytes(32).toString("hex");
  const full = `mv_${secret}`;
  const hash = hashApiKeyToken(full);
  const tokenPrefix = `${full.slice(0, 12)}…`;
  return { full, tokenPrefix, hash };
}

/** Bearer mv_… → userId или null */
export async function resolveApiKeyUserId(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token.startsWith("mv_") || token.length < 20) return null;
  const hash = hashApiKeyToken(token);
  const row = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.tokenHash, hash),
  });
  if (!row) return null;
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, row.id));
  return row.userId;
}
