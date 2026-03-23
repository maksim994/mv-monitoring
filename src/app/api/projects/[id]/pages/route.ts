import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { pages, projects } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  // Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, resolvedParams.id), eq(projects.userId, session.user.id)),
  });

  if (!project) return new NextResponse("Not found", { status: 404 });

  const projectPages = await db.query.pages.findMany({
    where: eq(pages.projectId, resolvedParams.id),
    orderBy: [desc(pages.createdAt)],
  });

  return NextResponse.json({ project, pages: projectPages });
}

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

  const { name, url, interval } = await req.json();
  if (!name || !url) return new NextResponse("Name and URL are required", { status: 400 });

  const [newPage] = await db.insert(pages).values({
    projectId: resolvedParams.id,
    name,
    url,
    interval: interval || 5,
  }).returning();

  return NextResponse.json(newPage);
}
