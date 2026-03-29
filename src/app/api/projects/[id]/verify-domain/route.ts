import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyDomainOwnership } from "@/lib/domain-verification";
import { serializeProjectForClient } from "@/lib/project-domain";

export async function POST(
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

  if (!project.domain) {
    return NextResponse.json(
      { error: "NO_DOMAIN", message: "У проекта не указан домен." },
      { status: 400 }
    );
  }

  if (project.domainVerifiedAt) {
    return NextResponse.json(serializeProjectForClient(project));
  }

  const token = project.domainVerificationToken;
  if (!token) {
    return NextResponse.json(
      {
        error: "NO_VERIFICATION_TOKEN",
        message: "Нет токена верификации. Сохраните домен в настройках проекта ещё раз.",
      },
      { status: 400 }
    );
  }

  const ok = await verifyDomainOwnership(project.domain, token);
  if (!ok) {
    return NextResponse.json(
      {
        error: "VERIFICATION_FAILED",
        message:
          "Не удалось найти токен. Добавьте meta-тег на главную или файл /.well-known/mv-monitor-verification.txt и попробуйте снова.",
      },
      { status: 422 }
    );
  }

  const [updated] = await db
    .update(projects)
    .set({
      domainVerifiedAt: new Date(),
      domainVerificationToken: null,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  return NextResponse.json(serializeProjectForClient(updated));
}
