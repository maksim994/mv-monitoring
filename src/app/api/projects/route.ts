import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { projects, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { generateDomainVerificationToken } from "@/lib/domain-verification";
import { serializeProjectForClient } from "@/lib/project-domain";
import { countUserProjects, getEffectivePlanKey, getPlanLimitRow } from "@/lib/billing/plan";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
    orderBy: [desc(projects.createdAt)],
  });

  return NextResponse.json(userProjects.map(serializeProjectForClient));
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const me = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
  });
  if (!me) return new NextResponse("Unauthorized", { status: 401 });

  const tier = getEffectivePlanKey(me);
  const lim = await getPlanLimitRow(tier);
  const projectCount = await countUserProjects(session.user.id);
  if (projectCount >= lim.maxProjects) {
    return NextResponse.json(
      { error: "PROJECT_LIMIT", message: "Достигнут лимит проектов для вашего тарифа." },
      { status: 403 }
    );
  }

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

  const domainVerificationToken = cleanDomain ? generateDomainVerificationToken() : null;
  const domainVerifiedAt = null;

  const [newProject] = await db.insert(projects).values({
    name,
    domain: cleanDomain,
    domainVerificationToken,
    domainVerifiedAt,
    userId: session.user.id,
  }).returning();

  return NextResponse.json(serializeProjectForClient(newProject));
}
