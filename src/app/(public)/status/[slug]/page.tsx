import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { pages, pingLogs, projects } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

type Props = { params: Promise<{ slug: string }> };

export default async function PublicStatusPage({ params }: Props) {
  const { slug } = await params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) notFound();

  const project = await db.query.projects.findFirst({
    where: eq(projects.statusSlug, normalized),
  });
  if (!project) notFound();

  const projectPages = await db.query.pages.findMany({
    where: eq(pages.projectId, project.id),
  });
  projectPages.sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const rows = await Promise.all(
    projectPages.map(async (p) => {
      const [last] = await db
        .select({
          isSuccess: pingLogs.isSuccess,
          status: pingLogs.status,
          responseTime: pingLogs.responseTime,
          createdAt: pingLogs.createdAt,
          errorMessage: pingLogs.errorMessage,
        })
        .from(pingLogs)
        .where(eq(pingLogs.pageId, p.id))
        .orderBy(desc(pingLogs.createdAt))
        .limit(1);

      return { page: p, last };
    })
  );

  const up = rows.filter((r) => r.last?.isSuccess).length;
  const total = rows.length;

  return (
    <div className="min-h-[70vh] border-b border-border/40">
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Статус</p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground mb-2">{project.name}</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Публичная страница. Обновляется по мере проверок мониторинга.
          {total > 0 ? (
            <>
              {" "}
              Сейчас доступно: {up}/{total}.
            </>
          ) : null}
        </p>

        {rows.length === 0 ? (
          <p className="text-muted-foreground">Мониторы ещё не добавлены.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map(({ page: p, last }) => (
              <li
                key={p.id}
                className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{p.url}</div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {!p.isActive ? (
                    <span className="text-xs text-muted-foreground">На паузе</span>
                  ) : last ? (
                    <>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          last.isSuccess
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {last.isSuccess ? "Ок" : "Сбой"}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {last.responseTime} мс
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Нет данных</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-12 text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            MV Monitor
          </Link>
        </p>
      </div>
    </div>
  );
}
