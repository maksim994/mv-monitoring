import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { pages, projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

  const { pages: newPages } = await req.json();
  
  if (!Array.isArray(newPages) || newPages.length === 0) {
    return new NextResponse("Pages array is required", { status: 400 });
  }

  const valuesToInsert = newPages.map((page: any) => ({
    projectId: resolvedParams.id,
    name: page.name,
    url: page.url,
    interval: page.interval || 5,
    isActive: true,
  }));

  const insertedPages = await db.insert(pages).values(valuesToInsert).returning();

  return NextResponse.json({ success: true, count: insertedPages.length });
}
