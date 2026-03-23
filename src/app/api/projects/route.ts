import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
    orderBy: [desc(projects.createdAt)],
  });

  return NextResponse.json(userProjects);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

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

  const [newProject] = await db.insert(projects).values({
    name,
    domain: cleanDomain,
    userId: session.user.id,
  }).returning();

  return NextResponse.json(newProject);
}
