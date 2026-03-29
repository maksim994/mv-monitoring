import { NextResponse } from "next/server";
import { getAdminSessionOrDeny } from "@/lib/admin";
import { db } from "@/db";
import { pingLogs, users } from "@/db/schema";
import { sql, gte } from "drizzle-orm";
import { Queue } from "bullmq";

export async function GET() {
  const gate = await getAdminSessionOrDeny();
  if ("response" in gate) return gate.response;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [pingRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(pingLogs)
    .where(gte(pingLogs.createdAt, since));
  const [userRow] = await db.select({ c: sql<number>`count(*)::int` }).from(users);

  let pingQueueWaiting: number | null = null;
  let notifyQueueWaiting: number | null = null;
  const redisUrl = process.env.REDIS_URL?.trim();
  if (redisUrl) {
    const connection = { url: redisUrl, maxRetriesPerRequest: null };
    try {
      const pingQ = new Queue("pingQueue", { connection });
      const notifyQ = new Queue("notificationQueue", { connection });
      [pingQueueWaiting, notifyQueueWaiting] = await Promise.all([
        pingQ.getWaitingCount(),
        notifyQ.getWaitingCount(),
      ]);
      await pingQ.close();
      await notifyQ.close();
    } catch (e) {
      console.error("[admin metrics] redis", e);
    }
  }

  return NextResponse.json({
    pingLogsLast24h: pingRow?.c ?? 0,
    usersTotal: userRow?.c ?? 0,
    pingQueueWaiting,
    notifyQueueWaiting,
  });
}
