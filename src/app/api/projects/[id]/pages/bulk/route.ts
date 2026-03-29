import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { pages, projects, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { domainBlocksPageOperations, domainVerificationRequiredResponse } from "@/lib/project-domain";
import {
  countUserPages,
  getEffectivePlanKey,
  getPlanLimitRow,
} from "@/lib/billing/plan";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, session.user.id)),
  });

  if (!project) return new NextResponse("Not found", { status: 404 });

  if (domainBlocksPageOperations(project)) {
    return domainVerificationRequiredResponse();
  }

  const owner = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!owner) return new NextResponse("Unauthorized", { status: 401 });

  const tier = getEffectivePlanKey(owner);
  const lim = await getPlanLimitRow(tier);

  const { pages: newPages } = await req.json();
  
  if (!Array.isArray(newPages) || newPages.length === 0) {
    return new NextResponse("Pages array is required", { status: 400 });
  }

  const current = await countUserPages(session.user.id);
  if (current + newPages.length > lim.maxPagesPerUser) {
    return NextResponse.json(
      {
        error: "PAGE_LIMIT",
        message: `Можно добавить не более ${Math.max(0, lim.maxPagesPerUser - current)} страниц(ы) с текущим тарифом.`,
      },
      { status: 403 }
    );
  }

  const valuesToInsert = newPages.map((page: { name: string; url: string; interval?: number }) => {
    const raw = typeof page.interval === "number" && Number.isFinite(page.interval) ? page.interval : lim.minIntervalMinutes;
    const safeInterval = Math.max(lim.minIntervalMinutes, Math.floor(raw) || lim.minIntervalMinutes);
    return {
      projectId: resolvedParams.id,
      name: page.name,
      url: page.url,
      interval: safeInterval,
      isActive: true,
      checkType: "http" as const,
      checkConfig: {} as Record<string, unknown>,
    };
  });

  const insertedPages = await db.insert(pages).values(valuesToInsert).returning();

  return NextResponse.json({ success: true, count: insertedPages.length });
}
