import { NextResponse } from "next/server";
import { db } from "@/db";
import { pages, projects, users } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { domainBlocksPageOperations, domainVerificationRequiredResponse, serializeProjectForClient } from "@/lib/project-domain";
import {
  countUserPages,
  getEffectivePlanKey,
  getPlanLimitRow,
} from "@/lib/billing/plan";
import { parsePageCheckPayload } from "@/lib/page-check";
import { resolveApiKeyUserId } from "@/lib/api-key-auth";

async function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized", message: "Нужен заголовок Authorization: Bearer mv_…" },
    { status: 401 }
  );
}

async function getUserId(req: Request): Promise<string | null> {
  return resolveApiKeyUserId(req);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return unauthorized();

  const resolvedParams = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, userId)),
  });

  if (!project) return new NextResponse("Not found", { status: 404 });

  const projectPages = await db.query.pages.findMany({
    where: eq(pages.projectId, resolvedParams.id),
    orderBy: [desc(pages.createdAt)],
  });

  return NextResponse.json({
    project: serializeProjectForClient(project),
    pages: projectPages,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getUserId(req);
  if (!userId) return unauthorized();

  const resolvedParams = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, userId)),
  });

  if (!project) return new NextResponse("Not found", { status: 404 });

  if (domainBlocksPageOperations(project)) {
    return domainVerificationRequiredResponse();
  }

  const owner = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!owner) return new NextResponse("Unauthorized", { status: 401 });

  const tier = getEffectivePlanKey(owner);
  const lim = await getPlanLimitRow(tier);
  const pageCount = await countUserPages(userId);
  if (pageCount >= lim.maxPagesPerUser) {
    return NextResponse.json(
      { error: "PAGE_LIMIT", message: "Достигнут лимит мониторов для вашего тарифа." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { name, url, interval } = body as {
    name?: string;
    url?: string;
    interval?: number;
  };
  if (!name || !url) return new NextResponse("Name and URL are required", { status: 400 });

  const parsed = parsePageCheckPayload(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const rawInterval = typeof interval === "number" && Number.isFinite(interval) ? interval : lim.minIntervalMinutes;
  const safeInterval = Math.max(lim.minIntervalMinutes, Math.floor(rawInterval) || lim.minIntervalMinutes);

  const [newPage] = await db.insert(pages).values({
    projectId: resolvedParams.id,
    name,
    url,
    interval: safeInterval,
    checkType: parsed.checkType,
    checkConfig: parsed.checkConfig as Record<string, unknown>,
  }).returning();

  return NextResponse.json(newPage);
}
