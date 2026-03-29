import { NextResponse } from "next/server";
import { db } from "@/db";
import { pages, projects, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getEffectivePlanKey, getPlanLimitRow } from "@/lib/billing/plan";
import { parsePageCheckPayload } from "@/lib/page-check";
import { resolveApiKeyUserId } from "@/lib/api-key-auth";

async function unauthorized() {
  return NextResponse.json(
    { error: "Unauthorized", message: "Нужен заголовок Authorization: Bearer mv_…" },
    { status: 401 }
  );
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const userId = await resolveApiKeyUserId(req);
  if (!userId) return unauthorized();

  const resolvedParams = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, userId)),
  });

  if (!project) return new NextResponse("Project not found", { status: 404 });

  const owner = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!owner) return unauthorized();
  const tier = getEffectivePlanKey(owner);
  const lim = await getPlanLimitRow(tier);

  const existingPage = await db.query.pages.findFirst({
    where: and(eq(pages.id, resolvedParams.pageId), eq(pages.projectId, resolvedParams.id)),
  });
  if (!existingPage) return new NextResponse("Page not found", { status: 404 });

  const body = await req.json();
  const { name, url, interval, isActive, checkType, checkConfig } = body as {
    name?: string;
    url?: string;
    interval?: number;
    isActive?: boolean;
    checkType?: unknown;
    checkConfig?: unknown;
  };

  const parsed =
    checkType !== undefined || checkConfig !== undefined
      ? parsePageCheckPayload({
          checkType: checkType !== undefined ? checkType : existingPage.checkType,
          checkConfig: checkConfig !== undefined ? checkConfig : existingPage.checkConfig,
        })
      : null;
  if (parsed && "error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let nextInterval = existingPage.interval;
  if (typeof interval === "number" && Number.isFinite(interval)) {
    nextInterval = Math.max(lim.minIntervalMinutes, Math.floor(interval) || lim.minIntervalMinutes);
  }

  const [updatedPage] = await db
    .update(pages)
    .set({
      name: name !== undefined ? name : existingPage.name,
      url: url !== undefined ? url : existingPage.url,
      interval: nextInterval,
      isActive: isActive !== undefined ? isActive : existingPage.isActive,
      checkType: parsed ? parsed.checkType : existingPage.checkType,
      checkConfig: parsed ? (parsed.checkConfig as Record<string, unknown>) : existingPage.checkConfig,
      updatedAt: new Date(),
    })
    .where(and(eq(pages.id, resolvedParams.pageId), eq(pages.projectId, resolvedParams.id)))
    .returning();

  if (!updatedPage) return new NextResponse("Page not found", { status: 404 });

  return NextResponse.json(updatedPage);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; pageId: string }> }
) {
  const userId = await resolveApiKeyUserId(req);
  if (!userId) return unauthorized();

  const resolvedParams = await params;
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, userId)),
  });

  if (!project) return new NextResponse("Project not found", { status: 404 });

  const [deletedPage] = await db
    .delete(pages)
    .where(and(eq(pages.id, resolvedParams.pageId), eq(pages.projectId, resolvedParams.id)))
    .returning();

  if (!deletedPage) return new NextResponse("Page not found", { status: 404 });

  return NextResponse.json(deletedPage);
}
