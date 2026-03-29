import { NextResponse } from "next/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { resolveApiKeyUserId } from "@/lib/api-key-auth";
import { serializeProjectForClient } from "@/lib/project-domain";

export async function GET(req: Request) {
  const userId = await resolveApiKeyUserId(req);
  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Нужен заголовок Authorization: Bearer mv_…" },
      { status: 401 }
    );
  }

  const userProjects = await db.query.projects.findMany({
    where: eq(projects.userId, userId),
    orderBy: [desc(projects.createdAt)],
  });

  return NextResponse.json(userProjects.map(serializeProjectForClient));
}
