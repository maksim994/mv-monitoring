import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { pages, pingLogs, projects } from "@/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, session.user.id)),
  });

  if (!project) return new NextResponse("Not found", { status: 404 });

  const page = await db.query.pages.findFirst({
    where: and(eq(pages.id, resolvedParams.pageId), eq(pages.projectId, resolvedParams.id)),
  });

  if (!page) return new NextResponse("Page not found", { status: 404 });

  // Get logs for the last 24 hours
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const logs = await db.query.pingLogs.findMany({
    where: and(
      eq(pingLogs.pageId, resolvedParams.pageId),
      gte(pingLogs.createdAt, yesterday)
    ),
    orderBy: [desc(pingLogs.createdAt)],
    limit: 100, // Limit to 100 points for the chart
  });

  // Calculate uptime
  const totalPings = logs.length;
  const successfulPings = logs.filter(l => l.isSuccess).length;
  const uptime = totalPings > 0 ? (successfulPings / totalPings) * 100 : 100;

  return NextResponse.json({
    page,
    logs: logs.reverse(), // ascending order for chart
    uptime: uptime.toFixed(2),
  });
}
