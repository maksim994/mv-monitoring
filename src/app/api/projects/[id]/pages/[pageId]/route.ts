import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { pages, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
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

  if (!project) return new NextResponse("Project not found", { status: 404 });

  const { name, url, interval, isActive } = await req.json();

  const [updatedPage] = await db.update(pages)
    .set({ 
      name, 
      url, 
      interval: interval || 5,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date() 
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
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, session.user.id)),
  });

  if (!project) return new NextResponse("Project not found", { status: 404 });

  const [deletedPage] = await db.delete(pages)
    .where(and(eq(pages.id, resolvedParams.pageId), eq(pages.projectId, resolvedParams.id)))
    .returning();

  if (!deletedPage) return new NextResponse("Page not found", { status: 404 });

  return NextResponse.json(deletedPage);
}
