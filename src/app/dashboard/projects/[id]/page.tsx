"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Plus, Globe, ArrowLeft, Activity, Clock, Settings, MoreHorizontal, Edit, Trash, Pause, Play, Search, CheckSquare } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<{ project: any; pages: any[] } | null>(null);
  const [analytics, setAnalytics] = useState<{ uptime: number; avgPing: number; chartData: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [newPage, setNewPage] = useState({ name: "", url: "", interval: 5 });
  const [editProject, setEditProject] = useState({ name: "", domain: "" });
  
  const [editPage, setEditPage] = useState<{ id: string; name: string; url: string; interval: number; isActive: boolean } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPageUpdating, setIsPageUpdating] = useState(false);

  // Auto-discover state
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
  const [discoverUrl, setDiscoverUrl] = useState("");
  const [discoverLimit, setDiscoverLimit] = useState(200);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredPages, setDiscoveredPages] = useState<{ url: string; title: string }[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [discoverStep, setDiscoverStep] = useState<1 | 2>(1);
  const [discoverInterval, setDiscoverInterval] = useState(5);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  useEffect(() => {
    params.then(p => setProjectId(p.id));
  }, [params]);

  const fetchData = async () => {
    if (!projectId) return;
    
    const [pagesRes, analyticsRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/pages`),
      fetch(`/api/projects/${projectId}/analytics`)
    ]);

    if (pagesRes.ok) {
      const result = await pagesRes.json();
      setData(result);
      setEditProject({ name: result.project.name, domain: result.project.domain || "" });
      if (!discoverUrl && result.project.domain) {
        setDiscoverUrl(result.project.domain);
      }
    }
    if (analyticsRes.ok) {
      setAnalytics(await analyticsRes.json());
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPage.name || !newPage.url || !projectId) return;

    setIsCreating(true);
    const res = await fetch(`/api/projects/${projectId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPage),
    });

    if (res.ok) {
      setNewPage({ name: "", url: "", interval: 5 });
      setIsDialogOpen(false);
      fetchData();
    }
    setIsCreating(false);
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editProject.name || !projectId) return;

    setIsUpdating(true);
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editProject),
    });

    if (res.ok) {
      setIsSettingsOpen(false);
      fetchData();
    }
    setIsUpdating(false);
  };

  const handleUpdatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPage || !projectId) return;

    setIsPageUpdating(true);
    const res = await fetch(`/api/projects/${projectId}/pages/${editPage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editPage.name,
        url: editPage.url,
        interval: editPage.interval,
        isActive: editPage.isActive
      }),
    });

    if (res.ok) {
      setIsEditDialogOpen(false);
      fetchData();
    }
    setIsPageUpdating(false);
  };

  const handleDeletePage = async (pageId: string) => {
    if (!projectId || !confirm("Вы уверены, что хотите удалить эту страницу? Все логи будут удалены.")) return;

    const res = await fetch(`/api/projects/${projectId}/pages/${pageId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchData();
    }
  };

  const handleTogglePageStatus = async (page: any) => {
    if (!projectId) return;

    const res = await fetch(`/api/projects/${projectId}/pages/${page.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isActive: !page.isActive
      }),
    });

    if (res.ok) {
      fetchData();
    }
  };

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discoverUrl || !projectId) return;

    setIsDiscovering(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/discover?url=${encodeURIComponent(discoverUrl)}&limit=${discoverLimit}`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveredPages(data.pages || []);
        setSelectedPages(new Set((data.pages || []).map((p: any) => p.url)));
        setDiscoverStep(2);
      }
    } catch (error) {
      console.error("Failed to discover pages:", error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleBulkAdd = async () => {
    if (selectedPages.size === 0 || !projectId) return;

    setIsBulkAdding(true);
    
    const pagesToAdd = discoveredPages
      .filter(p => selectedPages.has(p.url))
      .map(p => ({
        name: p.title || p.url,
        url: p.url,
        interval: discoverInterval
      }));

    try {
      const res = await fetch(`/api/projects/${projectId}/pages/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pages: pagesToAdd }),
      });

      if (res.ok) {
        setIsDiscoverOpen(false);
        setDiscoverStep(1);
        setDiscoveredPages([]);
        setSelectedPages(new Set());
        fetchData();
      }
    } catch (error) {
      console.error("Failed to add pages:", error);
    } finally {
      setIsBulkAdding(false);
    }
  };

  const togglePageSelection = (url: string) => {
    const newSelected = new Set(selectedPages);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedPages(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedPages.size === discoveredPages.length) {
      setSelectedPages(new Set());
    } else {
      setSelectedPages(new Set(discoveredPages.map(p => p.url)));
    }
  };

  if (isLoading) return <div className="animate-pulse h-32 bg-slate-900 rounded-lg"></div>;
  if (!data) return <div>Проект не найден</div>;

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="inline-flex items-center text-sm text-zinc-500 hover:text-white mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к проектам
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight mb-1 flex items-center gap-3">
              {data.project.name}
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-white/10">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-medium">Настройки проекта</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleUpdateProject} className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Название проекта</label>
                      <Input
                        value={editProject.name}
                        onChange={(e) => setEditProject({ ...editProject, name: e.target.value })}
                        className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Основной домен</label>
                      <Input
                        placeholder="example.com"
                        value={editProject.domain}
                        onChange={(e) => setEditProject({ ...editProject, domain: e.target.value })}
                        className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                      />
                      <p className="text-xs text-zinc-500">
                        Необходим для автоматической проверки SSL и срока регистрации домена
                      </p>
                    </div>
                    <Button type="submit" className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium" disabled={isUpdating}>
                      {isUpdating ? "Сохранение..." : "Сохранить изменения"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </h1>
            <p className="text-zinc-400 font-light">
              {data.project.domain ? data.project.domain : "Мониторинг страниц проекта"}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Dialog open={isDiscoverOpen} onOpenChange={(open) => {
              setIsDiscoverOpen(open);
              if (!open) {
                setTimeout(() => setDiscoverStep(1), 300);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="h-10 border-white/10 bg-transparent hover:bg-white/5 text-white font-medium">
                  <Search className="mr-2 h-4 w-4" />
                  Автопоиск страниц
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[600px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl font-medium">
                    {discoverStep === 1 ? "Автопоиск страниц" : "Выберите страницы"}
                  </DialogTitle>
                </DialogHeader>
                
                {discoverStep === 1 ? (
                  <form onSubmit={handleDiscover} className="space-y-6 pt-4">
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">URL сайта для поиска</label>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        value={discoverUrl}
                        onChange={(e) => setDiscoverUrl(e.target.value)}
                        className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                        required
                      />
                      <p className="text-xs text-zinc-500">
                        Скрипт попытается найти sitemap.xml или просканирует ссылки на главной странице.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-zinc-400">Максимальное количество страниц</label>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={discoverLimit}
                        onChange={(e) => setDiscoverLimit(Number(e.target.value))}
                        className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                        required
                      />
                      <p className="text-xs text-zinc-500">
                        Ограничение необходимо, чтобы не перегрузить сервер при сборе Title для каждой страницы.
                      </p>
                    </div>
                    <Button type="submit" className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium" disabled={isDiscovering}>
                      {isDiscovering ? "Поиск страниц..." : "Начать поиск"}
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-col h-full overflow-hidden pt-4 gap-4">
                    <div className="flex items-center justify-between bg-black p-3 rounded-lg border border-white/5">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={toggleAllSelection}
                          className="flex items-center justify-center w-5 h-5 rounded border border-white/20 bg-transparent hover:bg-white/10 transition-colors"
                        >
                          {selectedPages.size === discoveredPages.length && (
                            <CheckSquare className="w-4 h-4 text-emerald-500" />
                          )}
                          {selectedPages.size > 0 && selectedPages.size < discoveredPages.length && (
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                          )}
                        </button>
                        <span className="text-sm font-medium">Выбрать все</span>
                      </div>
                      <span className="text-sm text-zinc-400">
                        Выбрано: {selectedPages.size} из {discoveredPages.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 min-h-[200px] max-h-[400px]">
                      {discoveredPages.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">Страницы не найдены</div>
                      ) : (
                        discoveredPages.map((page, i) => (
                          <div 
                            key={i} 
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedPages.has(page.url) 
                                ? 'bg-emerald-500/5 border-emerald-500/20' 
                                : 'bg-black border-white/5 hover:border-white/10'
                            }`}
                            onClick={() => togglePageSelection(page.url)}
                          >
                            <div className="mt-0.5">
                              <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                                selectedPages.has(page.url) ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/20'
                              }`}>
                                {selectedPages.has(page.url) && <CheckSquare className="w-4 h-4 text-emerald-500" />}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-white truncate" title={page.title}>{page.title || 'Без названия'}</div>
                              <div className="text-xs text-zinc-500 truncate mt-0.5" title={page.url}>{page.url}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-4 pt-2 border-t border-white/10 mt-auto">
                      <div className="space-y-2">
                        <label className="text-sm text-zinc-400">Интервал проверки для всех выбранных</label>
                        <select
                          value={discoverInterval}
                          onChange={(e) => setDiscoverInterval(Number(e.target.value))}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                        >
                          <option value={1}>1 минута</option>
                          <option value={5}>5 минут</option>
                          <option value={15}>15 минут</option>
                          <option value={60}>60 минут</option>
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setDiscoverStep(1)}
                          className="flex-1 h-12 border-white/10 bg-transparent hover:bg-white/5"
                        >
                          Назад
                        </Button>
                        <Button 
                          onClick={handleBulkAdd}
                          disabled={isBulkAdding || selectedPages.size === 0}
                          className="flex-1 h-12 bg-white text-black hover:bg-zinc-200 font-medium"
                        >
                          {isBulkAdding ? "Добавление..." : `Добавить (${selectedPages.size})`}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 bg-white text-black hover:bg-zinc-200 font-medium">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить страницу
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-medium">Добавить страницу</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePage} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Название</label>
                    <Input
                      placeholder="Например: Главная страница"
                      value={newPage.name}
                      onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                      className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">URL</label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={newPage.url}
                      onChange={(e) => setNewPage({ ...newPage, url: e.target.value })}
                      className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-zinc-400">Интервал проверки (минуты)</label>
                    <select
                      value={newPage.interval}
                      onChange={(e) => setNewPage({ ...newPage, interval: Number(e.target.value) })}
                      className="flex h-12 w-full items-center justify-between rounded-md border border-white/10 bg-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                    >
                      <option value={1}>1 минута</option>
                      <option value={5}>5 минут</option>
                      <option value={15}>15 минут</option>
                      <option value={60}>60 минут</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium" disabled={isCreating}>
                    {isCreating ? "Добавление..." : "Добавить страницу"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {analytics && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-[#111] border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Общая доступность (24ч)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium text-white">{analytics.uptime}%</div>
            </CardContent>
          </Card>
          <Card className="bg-[#111] border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Средний отклик (24ч)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium text-white">{analytics.avgPing} мс</div>
            </CardContent>
          </Card>
        </div>
      )}

      {analytics && analytics.chartData.length > 0 && (
        <Card className="bg-[#111] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-white">Общий график доступности</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.chartData}>
                  <defs>
                    <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis 
                    dataKey="time" 
                    stroke="#ffffff40" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    dy={10}
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    dx={-10}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#000', borderColor: '#ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="uptime"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUptime)"
                    name="Доступность (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-medium">Страницы</h2>
        </div>
        <div>
          {data.pages.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 font-light">
              Нет добавленных страниц.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-zinc-400 font-medium">Название</TableHead>
                  <TableHead className="text-zinc-400 font-medium">URL</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Интервал</TableHead>
                  <TableHead className="text-zinc-400 font-medium">Статус</TableHead>
                  <TableHead className="text-right text-zinc-400 font-medium">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.pages.map((page) => (
                  <TableRow key={page.id} className="border-white/5 hover:bg-white/5 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center">
                          <Globe className="h-4 w-4 text-zinc-400" />
                        </div>
                        {page.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-400 font-light">{page.url}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-zinc-400 font-light">
                        <Clock className="h-4 w-4" />
                        {page.interval} мин
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${page.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/10 text-zinc-400'}`}>
                        {page.isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                        {page.isActive ? "Активен" : "На паузе"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild className="hover:bg-white/10 hover:text-white text-zinc-400">
                          <Link href={`/dashboard/projects/${data.project.id}/pages/${page.id}`}>
                            <Activity className="h-4 w-4 mr-2" />
                            Графики
                          </Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#111] border-white/10 text-white">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditPage(page);
                                setIsEditDialogOpen(true);
                              }}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleTogglePageStatus(page)}
                              className="focus:bg-white/10 focus:text-white cursor-pointer"
                            >
                              {page.isActive ? (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Поставить на паузу
                                </>
                              ) : (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Возобновить
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-white/10" />
                            <DropdownMenuItem 
                              onClick={() => handleDeletePage(page.id)}
                              className="focus:bg-red-500/20 text-red-500 focus:text-red-500 cursor-pointer"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-[#111] border-white/10 text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">Редактировать страницу</DialogTitle>
          </DialogHeader>
          {editPage && (
            <form onSubmit={handleUpdatePage} className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Название</label>
                <Input
                  placeholder="Например: Главная страница"
                  value={editPage.name}
                  onChange={(e) => setEditPage({ ...editPage, name: e.target.value })}
                  className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={editPage.url}
                  onChange={(e) => setEditPage({ ...editPage, url: e.target.value })}
                  className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Интервал проверки (минуты)</label>
                <select
                  value={editPage.interval}
                  onChange={(e) => setEditPage({ ...editPage, interval: Number(e.target.value) })}
                  className="flex h-12 w-full items-center justify-between rounded-md border border-white/10 bg-black px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value={1}>1 минута</option>
                  <option value={5}>5 минут</option>
                  <option value={15}>15 минут</option>
                  <option value={60}>60 минут</option>
                </select>
              </div>
              <Button type="submit" className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium" disabled={isPageUpdating}>
                {isPageUpdating ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
