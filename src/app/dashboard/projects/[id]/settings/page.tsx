"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProjectSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [editProject, setEditProject] = useState({ name: "", domain: "", statusSlug: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  useEffect(() => {
    void params.then((p) => setProjectId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    const pagesRes = await fetch(`/api/projects/${projectId}/pages`);
    if (pagesRes.ok) {
      const result = (await pagesRes.json()) as {
        project: { name: string; domain: string | null; statusSlug: string | null };
      };
      setProjectName(result.project.name);
      setEditProject({
        name: result.project.name,
        domain: result.project.domain || "",
        statusSlug: result.project.statusSlug || "",
      });
    }
    setIsLoading(false);
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject.name || !projectId) return;
    setIsUpdating(true);
    setSettingsError(null);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editProject),
    });
    if (res.ok) {
      setProjectName(editProject.name);
      await load();
    } else {
      try {
        const j = (await res.json()) as { error?: string };
        setSettingsError(typeof j.error === "string" ? j.error : "Не удалось сохранить");
      } catch {
        setSettingsError("Не удалось сохранить");
      }
    }
    setIsUpdating(false);
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    if (
      !confirm(
        `Удалить проект «${projectName}»? Все страницы и история проверок будут удалены безвозвратно.`
      )
    ) {
      return;
    }
    setIsDeletingProject(true);
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    setIsDeletingProject(false);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  if (isLoading || !projectId) {
    return <div className="animate-pulse h-32 rounded-lg bg-slate-900" />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href={`/dashboard/projects/${projectId}`}
          className="mb-4 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к проекту
        </Link>
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-muted-foreground" />
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Настройки проекта</h1>
            <p className="text-muted-foreground">{projectName}</p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Уведомления о мониторинге настраиваются в разделе{" "}
          <Link href="/dashboard/settings" className="text-primary underline hover:no-underline">
            Настройки
          </Link>{" "}
          в боковом меню.
        </p>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Проект</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProject} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Название проекта</label>
              <Input
                value={editProject.name}
                onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                className="h-12 border-border bg-muted focus-visible:ring-ring/40"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Основной домен</label>
              <Input
                placeholder="example.com"
                value={editProject.domain}
                onChange={(e) => setEditProject({ ...editProject, domain: e.target.value })}
                className="h-12 border-border bg-muted focus-visible:ring-ring/40"
              />
              <p className="text-xs text-muted-foreground">
                Необходим для SSL, Whois и верификации владения. При смене домена подтверждение нужно пройти заново.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Публичная страница статуса</label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="shrink-0 text-sm text-muted-foreground">/status/</span>
                <Input
                  placeholder="my-service"
                  value={editProject.statusSlug}
                  onChange={(e) => setEditProject({ ...editProject, statusSlug: e.target.value })}
                  className="h-12 border-border bg-muted focus-visible:ring-ring/40 sm:flex-1"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Латиница, цифры и дефисы, 3–64 символа. Оставьте пустым, чтобы отключить.
              </p>
              {editProject.statusSlug.trim() ? (
                <p className="text-xs">
                  <Link
                    href={`/status/${editProject.statusSlug.trim().toLowerCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:no-underline"
                  >
                    Открыть публичную страницу
                  </Link>
                </p>
              ) : null}
            </div>
            {settingsError ? <p className="text-sm text-red-500">{settingsError}</p> : null}
            <Button
              type="submit"
              className="h-12 w-full bg-primary font-medium text-primary-foreground hover:bg-primary/90"
              disabled={isUpdating}
            >
              {isUpdating ? "Сохранение..." : "Сохранить изменения"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40 bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-medium text-destructive">Удаление проекта</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs font-light leading-relaxed text-muted-foreground">
            Будут удалены все страницы этого проекта и записи о проверках. Действие необратимо.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="h-12 w-full font-medium"
            disabled={isDeletingProject}
            onClick={() => void handleDeleteProject()}
          >
            {isDeletingProject ? "Удаление..." : "Удалить проект"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
