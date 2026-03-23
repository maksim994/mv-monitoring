import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const resolvedParams = await params;
  const projectId = resolvedParams.id;
  const { name, domain } = await req.json();

  if (!name) return new NextResponse("Name is required", { status: 400 });

  let cleanDomain = null;
  if (domain) {
    try {
      const urlString = domain.startsWith('http') ? domain : `https://${domain}`;
      const url = new URL(urlString);
      cleanDomain = url.hostname;
    } catch (e) {
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

  const [updatedProject] = await db.update(projects)
    .set({ name, domain: cleanDomain, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();

  return NextResponse.json(updatedProject);
}
