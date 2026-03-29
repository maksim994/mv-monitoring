import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { projects, pages } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { processNotificationJob } from "@/lib/notifications/process-job";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const [project] = await db.query.projects.findMany({
    where: eq(projects.userId, session.user.id),
    orderBy: [asc(projects.createdAt)],
    limit: 1,
  });

  if (!project) {
    return NextResponse.json(
      { error: "NO_PROJECTS", message: "Создайте проект и добавьте страницу, чтобы отправить тест." },
      { status: 400 }
    );
  }

  const [firstPage] = await db.query.pages.findMany({
    where: eq(pages.projectId, project.id),
    limit: 1,
  });

  if (!firstPage) {
    return NextResponse.json(
      { error: "NO_PAGES", message: "Добавьте хотя бы одну страницу в проект для теста." },
      { status: 400 }
    );
  }

  await processNotificationJob({
    projectId: project.id,
    pageId: firstPage.id,
    pageName: "[Тест] " + firstPage.name,
    pageUrl: firstPage.url,
    projectName: project.name,
    event: "down",
    status: 0,
    responseTime: 0,
    errorMessage: "Тестовое уведомление из настроек MV Monitor",
  });

  return NextResponse.json({ ok: true });
}
