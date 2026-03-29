import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { parseStatusSlug } from "@/lib/status-slug";
import { generateDomainVerificationToken } from "@/lib/domain-verification";
import { serializeProjectForClient } from "@/lib/project-domain";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  const body = await req.json();
  const { name, domain, statusSlug: statusSlugRaw } = body as {
    name?: string;
    domain?: unknown;
    statusSlug?: unknown;
  };

  if (!name) return new NextResponse("Name is required", { status: 400 });

  const slugParsed = parseStatusSlug(statusSlugRaw);
  if (slugParsed.error) {
    return NextResponse.json({ error: slugParsed.error }, { status: 400 });
  }

  let cleanDomain: string | null = null;
  if (typeof domain === "string" && domain.trim()) {
    try {
      const urlString = domain.startsWith("http") ? domain : `https://${domain}`;
      const url = new URL(urlString);
      cleanDomain = url.hostname;
    } catch {
      cleanDomain = domain;
    }
  }

  // Verify ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project) {
    return new NextResponse("Project not found", { status: 404 });
  }

  if (domain === undefined) {
    cleanDomain = project.domain ?? null;
  }

  if (statusSlugRaw !== undefined) {
    if (slugParsed.slug) {
      const taken = await db.query.projects.findFirst({
        where: and(eq(projects.statusSlug, slugParsed.slug), ne(projects.id, projectId)),
      });
      if (taken) {
        return NextResponse.json(
          { error: "Этот адрес страницы статуса уже занят" },
          { status: 409 }
        );
      }
    }
  }

  const prevDomain = project.domain ?? null;
  const nextDomain = cleanDomain ?? null;
  const domainChanged = prevDomain !== nextDomain;

  let domainVerificationToken = project.domainVerificationToken;
  let domainVerifiedAt = project.domainVerifiedAt;

  if (domainChanged) {
    if (!nextDomain) {
      domainVerificationToken = null;
      domainVerifiedAt = null;
    } else {
      domainVerificationToken = generateDomainVerificationToken();
      domainVerifiedAt = null;
    }
  }

  const [updatedProject] = await db
    .update(projects)
    .set({
      name,
      domain: cleanDomain,
      domainVerificationToken,
      domainVerifiedAt,
      ...(statusSlugRaw !== undefined ? { statusSlug: slugParsed.slug } : {}),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  return NextResponse.json(serializeProjectForClient(updatedProject));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { id: projectId } = await params;

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.userId, session.user.id)),
  });

  if (!project) {
    return new NextResponse("Project not found", { status: 404 });
  }

  await db.delete(projects).where(eq(projects.id, projectId));

  return new NextResponse(null, { status: 204 });
}
