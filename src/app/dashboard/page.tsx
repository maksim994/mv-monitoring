"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Folder } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectCard } from "@/components/dashboard/project-card";

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDomain, setNewProjectDomain] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchProjects = async () => {
    const res = await fetch("/api/projects");
    if (res.ok) {
      setProjects(await res.json());
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName) return;

    setIsCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName, domain: newProjectDomain }),
    });

    if (res.ok) {
      setNewProjectName("");
      setNewProjectDomain("");
      setIsDialogOpen(false);
      fetchProjects();
    }
    setIsCreating(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-medium tracking-tight mb-1">Проекты</h1>
          <p className="text-zinc-400 font-light">Управляйте вашими проектами и сайтами</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 bg-white text-black hover:bg-zinc-200 font-medium">
              <Plus className="mr-2 h-4 w-4" />
              Новый проект
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-medium">Создать проект</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Название проекта</label>
                <Input
                  placeholder="Например: Основной сайт"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Основной домен (опционально)</label>
                <Input
                  placeholder="example.com"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                  className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                />
                <p className="text-xs text-zinc-500">
                  Необходим для автоматической проверки SSL и срока регистрации домена
                </p>
              </div>
              <Button type="submit" className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium" disabled={isCreating}>
                {isCreating ? "Создание..." : "Создать проект"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-[#111] animate-pulse h-[120px]" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center border border-dashed border-white/10 rounded-2xl bg-[#111]/50">
          <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Folder className="h-6 w-6 text-zinc-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">Нет проектов</h3>
          <p className="text-zinc-400 font-light max-w-sm mb-6">
            Создайте свой первый проект, чтобы начать мониторинг сайтов.
          </p>
          <Button onClick={() => setIsDialogOpen(true)} variant="outline" className="h-10 border-white/10 bg-transparent hover:bg-white/5">
            Создать проект
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
