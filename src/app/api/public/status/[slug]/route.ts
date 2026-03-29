import { NextResponse } from "next/server";
import { db } from "@/db";
import { pages, pingLogs, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.statusSlug, normalized),
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const projectPages = await db.query.pages.findMany({
    where: eq(pages.projectId, project.id),
    orderBy: (p, { asc }) => [asc(p.name)],
  });

  const monitors = await Promise.all(
    projectPages.map(async (p) => {
      const [last] = await db
        .select({
          isSuccess: pingLogs.isSuccess,
          status: pingLogs.status,
          responseTime: pingLogs.responseTime,
          createdAt: pingLogs.createdAt,
          errorMessage: pingLogs.errorMessage,
        })
        .from(pingLogs)
        .where(eq(pingLogs.pageId, p.id))
        .orderBy(desc(pingLogs.createdAt))
        .limit(1);

      return {
        id: p.id,
        name: p.name,
        url: p.url,
        checkType: p.checkType,
        isActive: p.isActive,
        lastCheck: last
          ? {
              ok: last.isSuccess,
              status: last.status,
              responseTimeMs: last.responseTime,
              at: last.createdAt.toISOString(),
              errorMessage: last.errorMessage,
            }
          : null,
      };
    })
  );

  return NextResponse.json({
    projectName: project.name,
    slug: normalized,
    monitors,
  });
}
