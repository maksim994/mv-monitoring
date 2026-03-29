import { NextResponse } from "next/server";
import { getAdminSessionOrDeny } from "@/lib/admin";
import { db } from "@/db";
import { users, projects, pages, pingLogs, notificationLogs } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const gate = await getAdminSessionOrDeny();
  if ("response" in gate) return gate.response;

  const { userId } = await params;
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { password: _pw, ...userSafe } = user;

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
  });

  const projectIds = userProjects.map((p) => p.id);
  const userPages =
    projectIds.length === 0
      ? []
      : await db.query.pages.findMany({
          where: inArray(pages.projectId, projectIds),
        });

  const pageIds = userPages.map((p) => p.id);
  const recentPings =
    pageIds.length === 0
      ? []
      : await db.query.pingLogs.findMany({
          where: inArray(pingLogs.pageId, pageIds),
          orderBy: [desc(pingLogs.createdAt)],
          limit: 50,
        });

  const recentNotifs =
    projectIds.length === 0
      ? []
      : await db.query.notificationLogs.findMany({
          where: inArray(notificationLogs.projectId, projectIds),
          orderBy: [desc(notificationLogs.createdAt)],
          limit: 50,
        });

  return NextResponse.json({
    user: {
      id: userSafe.id,
      email: userSafe.email,
      name: userSafe.name,
      planTier: userSafe.planTier,
      proValidUntil: userSafe.proValidUntil?.toISOString() ?? null,
      banned: userSafe.banned,
      role: userSafe.role,
      notifyEmailEnabled: userSafe.notifyEmailEnabled,
      notifyTelegramEnabled: userSafe.notifyTelegramEnabled,
      notifyWebhookEnabled: userSafe.notifyWebhookEnabled,
      notifyWebhookUrl: userSafe.notifyWebhookUrl ? "***" : null,
    },
    projects: userProjects,
    pages: userPages,
    recentPings,
    recentNotifs,
  });
}
