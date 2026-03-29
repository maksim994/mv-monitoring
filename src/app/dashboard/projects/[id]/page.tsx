"use client";

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Plus,
  Globe,
  ArrowLeft,
  Activity,
  Clock,
  Settings,
  MoreHorizontal,
  Edit,
  Trash,
  Pause,
  Play,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { DomainVerificationPanel } from "@/components/dashboard/domain-verification-panel";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/hooks/use-mounted";

/** Домен из настроек проекта → валидный URL для type="url" и для API (https по умолчанию). */
function discoverUrlFromProjectDomain(domain: string | null | undefined): string {
  if (!domain?.trim()) return "";
  const d = domain.trim();
  return /^https?:\/\//i.test(d) ? d : `https://${d}`;
}

const PAGES_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

const CHECK_LABELS: Record<string, string> = {
  http: "HTTP 2xx",
  keyword: "Ключевое слово",
  ssl_expiry: "Срок SSL",
};

function pageToEditState(page: {
  id: string;
  name: string;
  url: string;
  interval: number;
  isActive: boolean;
  checkType?: string | null;
  checkConfig?: Record<string, unknown> | null;
}) {
  const cfg = (page.checkConfig && typeof page.checkConfig === "object"
    ? page.checkConfig
    : {}) as Record<string, unknown>;
  const kw = typeof cfg.keyword === "string" ? cfg.keyword : "";
  const cs = cfg.caseSensitive === true;
  const wd =
    typeof cfg.warnDays === "number" && Number.isFinite(cfg.warnDays) ? cfg.warnDays : 14;
  return {
    id: page.id,
    name: page.name,
    url: page.url,
    interval: page.interval,
    isActive: page.isActive,
    checkType: page.checkType || "http",
    keyword: kw,
    caseSensitive: cs,
    warnDays: wd,
  };
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [data, setData] = useState<{ project: any; pages: any[] } | null>(null);
  const [analytics, setAnalytics] = useState<{ uptime: number; avgPing: number; chartData: any[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [newPage, setNewPage] = useState({
    name: "",
    url: "",
    interval: 5,
    checkType: "http" as string,
    keyword: "",
    caseSensitive: false,
    warnDays: 14,
  });

  const [editPage, setEditPage] = useState<ReturnType<typeof pageToEditState> | null>(null);
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
  const [addPageError, setAddPageError] = useState<string | null>(null);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [pagesSearchQuery, setPagesSearchQuery] = useState("");
  const [pagesPage, setPagesPage] = useState(1);
  const [pagesPageSize, setPagesPageSize] = useState(20);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);
  const chartMounted = useMounted();

  const filteredPages = useMemo(() => {
    if (!data?.pages?.length) return [];
    const q = pagesSearchQuery.trim().toLowerCase();
    if (!q) return data.pages;
    return data.pages.filter(
      (p: { name: string; url: string }) =>
        p.name.toLowerCase().includes(q) || p.url.toLowerCase().includes(q)
    );
  }, [data?.pages, pagesSearchQuery]);

  const pagesTotalFiltered = filteredPages.length;
  const pagesTotalPages = Math.max(1, Math.ceil(pagesTotalFiltered / pagesPageSize));
  const pagesSafePage = Math.min(pagesPage, pagesTotalPages);

  const paginatedPages = useMemo(() => {
    const start = (pagesSafePage - 1) * pagesPageSize;
    return filteredPages.slice(start, start + pagesPageSize);
  }, [filteredPages, pagesSafePage, pagesPageSize]);

  useEffect(() => {
    setPagesPage(1);
  }, [pagesSearchQuery]);

  useEffect(() => {
    setPagesPage((p) => Math.min(p, pagesTotalPages));
  }, [pagesTotalPages]);

  useLayoutEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el || discoveredPages.length === 0) {
      if (el) el.indeterminate = false;
      return;
    }
    el.indeterminate =
      selectedPages.size > 0 && selectedPages.size < discoveredPages.length;
  }, [selectedPages, discoveredPages.length]);

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
      setDiscoverUrl(discoverUrlFromProjectDomain(result.project.domain));
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
    setAddPageError(null);
    const checkConfig: Record<string, unknown> = {};
    if (newPage.checkType === "keyword") {
      checkConfig.keyword = newPage.keyword;
      checkConfig.caseSensitive = newPage.caseSensitive;
    } else if (newPage.checkType === "ssl_expiry") {
      checkConfig.warnDays = newPage.warnDays;
    }

    const res = await fetch(`/api/projects/${projectId}/pages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newPage.name,
        url: newPage.url,
        interval: newPage.interval,
        checkType: newPage.checkType,
        checkConfig,
      }),
    });

    if (res.ok) {
      setNewPage({
        name: "",
        url: "",
        interval: 5,
        checkType: "http",
        keyword: "",
        caseSensitive: false,
        warnDays: 14,
      });
      setIsDialogOpen(false);
      fetchData();
    } else if (res.status === 403) {
      try {
        const j = await res.json();
        setAddPageError(typeof j.message === "string" ? j.message : "Доступ запрещён");
      } catch {
        setAddPageError("Доступ запрещён");
      }
    }
    setIsCreating(false);
  };

  const handleUpdatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPage || !projectId) return;

    setIsPageUpdating(true);
    const editCheckConfig: Record<string, unknown> = {};
    if (editPage.checkType === "keyword") {
      editCheckConfig.keyword = editPage.keyword;
      editCheckConfig.caseSensitive = editPage.caseSensitive;
    } else if (editPage.checkType === "ssl_expiry") {
      editCheckConfig.warnDays = editPage.warnDays;
    }
    const res = await fetch(`/api/projects/${projectId}/pages/${editPage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editPage.name,
        url: editPage.url,
        interval: editPage.interval,
        isActive: editPage.isActive,
        checkType: editPage.checkType,
        checkConfig: editCheckConfig,
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
    setDiscoverError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/discover?url=${encodeURIComponent(discoverUrl)}&limit=${discoverLimit}`);
      if (res.ok) {
        const data = await res.json();
        setDiscoveredPages(data.pages || []);
        setSelectedPages(new Set((data.pages || []).map((p: any) => p.url)));
        setDiscoverStep(2);
      } else if (res.status === 403) {
        try {
          const j = await res.json();
          setDiscoverError(typeof j.message === "string" ? j.message : "Доступ запрещён");
        } catch {
          setDiscoverError("Доступ запрещён");
        }
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
    setBulkError(null);

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
      } else if (res.status === 403) {
        try {
          const j = await res.json();
          setBulkError(typeof j.message === "string" ? j.message : "Доступ запрещён");
        } catch {
          setBulkError("Доступ запрещён");
        }
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

  const needsDomainVerification = Boolean(data.project.domain && !data.project.domainVerifiedAt);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к проектам
        </Link>

        {projectId && needsDomainVerification && data.project.domain ? (
          <DomainVerificationPanel
            projectId={projectId}
            domain={data.project.domain}
            token={data.project.domainVerificationToken ?? null}
            onVerified={() => void fetchData()}
            className="mb-6"
          />
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-medium tracking-tight mb-1 flex items-center gap-3">
              {data.project.name}
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" asChild>
                <Link href={`/dashboard/projects/${projectId}/settings`} aria-label="Настройки проекта">
                  <Settings className="h-4 w-4" />
                </Link>
              </Button>
            </h1>
            <p className="text-muted-foreground font-light">
              {data.project.domain ? data.project.domain : "Мониторинг страниц проекта"}
            </p>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 sm:shrink-0">
            <Dialog open={isDiscoverOpen} onOpenChange={(open) => {
              setIsDiscoverOpen(open);
              if (open) {
                setDiscoverError(null);
                setBulkError(null);
              }
              if (!open) {
                setTimeout(() => setDiscoverStep(1), 300);
              }
            }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 w-full justify-center border-border bg-transparent hover:bg-muted/70 text-foreground font-medium sm:w-auto"
                  disabled={needsDomainVerification || !data.project.domain}
                  title={
                    needsDomainVerification
                      ? "Сначала подтвердите владение доменом"
                      : !data.project.domain
                        ? "Укажите основной домен на странице настроек проекта"
                        : undefined
                  }
                >
                  <Search className="mr-2 h-4 w-4" />
                  Автопоиск страниц
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground sm:max-w-[600px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-xl font-medium">
                    {discoverStep === 1 ? "Автопоиск страниц" : "Выберите страницы"}
                  </DialogTitle>
                </DialogHeader>
                
                {discoverStep === 1 ? (
                  <form onSubmit={handleDiscover} className="space-y-6 pt-4">
                    {discoverError ? (
                      <p className="text-sm text-red-500">{discoverError}</p>
                    ) : null}
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Сайт для поиска</label>
                      {data.project.domain ? (
                        <>
                          <Input
                            type="url"
                            value={discoverUrl}
                            readOnly
                            aria-readonly="true"
                            className="h-12 cursor-default border-border bg-muted/70 text-foreground focus-visible:ring-0"
                          />
                          <p className="text-xs text-muted-foreground">
                            Совпадает с основным доменом проекта. Чтобы изменить сайт для поиска, отредактируйте домен на
                            странице настроек (шестерёнка рядом с названием).
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Укажите основной домен в настройках проекта (шестерёнка → страница настроек), сохраните
                          изменения — затем автопоиск станет доступен.
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Поиск идёт по sitemap.xml или по ссылкам на главной странице.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Максимальное количество страниц</label>
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={discoverLimit}
                        onChange={(e) => setDiscoverLimit(Number(e.target.value))}
                        className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Ограничение необходимо, чтобы не перегрузить сервер при сборе Title для каждой страницы.
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                      disabled={isDiscovering || !data.project.domain || !discoverUrl}
                    >
                      {isDiscovering ? "Поиск страниц..." : "Начать поиск"}
                    </Button>
                  </form>
                ) : (
                  <div className="flex flex-col h-full overflow-hidden pt-4 gap-4">
                    <div className="flex items-center justify-between bg-muted p-3 rounded-lg border border-border/40">
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          ref={selectAllCheckboxRef}
                          type="checkbox"
                          className="h-4 w-4 shrink-0 cursor-pointer rounded-sm border border-input bg-background accent-primary"
                          checked={
                            discoveredPages.length > 0 &&
                            selectedPages.size === discoveredPages.length
                          }
                          onChange={toggleAllSelection}
                        />
                        <span className="text-sm font-medium text-foreground">Выбрать все</span>
                      </label>
                      <span className="text-sm text-muted-foreground">
                        Выбрано: {selectedPages.size} из {discoveredPages.length}
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-2 min-h-[200px] max-h-[400px]">
                      {discoveredPages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Страницы не найдены</div>
                      ) : (
                        discoveredPages.map((page, i) => (
                          <label
                            key={page.url ?? i}
                            className={cn(
                              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedPages.has(page.url)
                                ? "bg-muted/80 border-border"
                                : "bg-muted border-border/40 hover:border-border"
                            )}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-sm border border-input bg-background accent-primary"
                              checked={selectedPages.has(page.url)}
                              onChange={() => togglePageSelection(page.url)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground truncate" title={page.title}>
                                {page.title || "Без названия"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate mt-0.5" title={page.url}>
                                {page.url}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>

                    <div className="space-y-4 pt-2 border-t border-border mt-auto">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Интервал проверки для всех выбранных</label>
                        <select
                          value={discoverInterval}
                          onChange={(e) => setDiscoverInterval(Number(e.target.value))}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                        >
                          <option value={1}>1 минута</option>
                          <option value={5}>5 минут</option>
                          <option value={15}>15 минут</option>
                          <option value={60}>60 минут</option>
                        </select>
                      </div>
                      {bulkError ? <p className="text-sm text-red-500">{bulkError}</p> : null}
                    <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setDiscoverStep(1)}
                          className="flex-1 h-12 border-border bg-transparent hover:bg-muted/70"
                        >
                          Назад
                        </Button>
                        <Button 
                          onClick={handleBulkAdd}
                          disabled={isBulkAdding || selectedPages.size === 0}
                          className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                        >
                          {isBulkAdding ? "Добавление..." : `Добавить (${selectedPages.size})`}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (open) setAddPageError(null);
              }}
            >
              <DialogTrigger asChild>
                <Button
                  className="h-10 w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 font-medium sm:w-auto"
                  disabled={needsDomainVerification}
                  title={needsDomainVerification ? "Сначала подтвердите владение доменом" : undefined}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить страницу
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border text-foreground sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl font-medium">Добавить страницу</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePage} className="space-y-6 pt-4">
                  {addPageError ? <p className="text-sm text-red-500">{addPageError}</p> : null}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Название</label>
                    <Input
                      placeholder="Например: Главная страница"
                      value={newPage.name}
                      onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                      className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">URL</label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={newPage.url}
                      onChange={(e) => setNewPage({ ...newPage, url: e.target.value })}
                      className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Тип проверки</label>
                    <select
                      value={newPage.checkType}
                      onChange={(e) => setNewPage({ ...newPage, checkType: e.target.value })}
                      className="flex h-12 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      <option value="http">HTTP — ответ 2xx</option>
                      <option value="keyword">Текст на странице (ключевое слово)</option>
                      <option value="ssl_expiry">Срок действия SSL</option>
                    </select>
                  </div>
                  {newPage.checkType === "keyword" ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Подстрока в HTML</label>
                        <Input
                          placeholder="Например: OK или уникальный фрагмент HTML"
                          value={newPage.keyword}
                          onChange={(e) => setNewPage({ ...newPage, keyword: e.target.value })}
                          className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                          required
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border accent-primary"
                          checked={newPage.caseSensitive}
                          onChange={(e) => setNewPage({ ...newPage, caseSensitive: e.target.checked })}
                        />
                        Учитывать регистр
                      </label>
                    </>
                  ) : null}
                  {newPage.checkType === "ssl_expiry" ? (
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Минимум дней до истечения</label>
                      <Input
                        type="number"
                        min={0}
                        max={3650}
                        value={newPage.warnDays}
                        onChange={(e) => setNewPage({ ...newPage, warnDays: Number(e.target.value) })}
                        className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                      />
                      <p className="text-xs text-muted-foreground">
                        URL должен указывать на HTTPS-хост (порт 443). При меньшем запасе дней проверка считается неуспешной.
                      </p>
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Интервал проверки (минуты)</label>
                    <select
                      value={newPage.interval}
                      onChange={(e) => setNewPage({ ...newPage, interval: Number(e.target.value) })}
                      className="flex h-12 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                    >
                      <option value={1}>1 минута</option>
                      <option value={5}>5 минут</option>
                      <option value={15}>15 минут</option>
                      <option value={60}>60 минут</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium" disabled={isCreating}>
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
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Общая доступность (24ч)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium text-foreground">{analytics.uptime}%</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Средний отклик (24ч)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-medium text-foreground">{analytics.avgPing} мс</div>
            </CardContent>
          </Card>
        </div>
      )}

      {analytics && analytics.chartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg font-medium text-foreground">Общий график доступности</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              {chartMounted ? (
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
                      contentStyle={{ backgroundColor: "#000", borderColor: "#ffffff20", borderRadius: "8px" }}
                      itemStyle={{ color: "#fff" }}
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
              ) : (
                <div className="h-full w-full animate-pulse rounded-lg bg-muted/40" aria-hidden />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border/40 p-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-medium">Страницы</h2>
          {data.pages.length > 0 ? (
            <div className="flex w-full flex-col gap-3 sm:max-w-2xl sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  type="search"
                  placeholder="Поиск по названию или URL…"
                  value={pagesSearchQuery}
                  onChange={(e) => setPagesSearchQuery(e.target.value)}
                  className="h-10 border-border bg-muted pl-9 focus-visible:ring-ring/40"
                  aria-label="Поиск страниц"
                />
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                <label htmlFor="pages-page-size" className="text-xs text-muted-foreground whitespace-nowrap">
                  На странице
                </label>
                <select
                  id="pages-page-size"
                  value={pagesPageSize}
                  onChange={(e) => {
                    setPagesPageSize(Number(e.target.value));
                    setPagesPage(1);
                  }}
                  className="flex h-10 min-w-[4.5rem] items-center rounded-md border border-border bg-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  {PAGES_PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
        <div>
          {data.pages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground font-light">
              Нет добавленных страниц.
            </div>
          ) : filteredPages.length === 0 ? (
            <div className="space-y-2 py-12 text-center">
              <p className="text-muted-foreground font-light">Ничего не найдено.</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setPagesSearchQuery("")}>
                Сбросить поиск
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-muted-foreground font-medium">Название</TableHead>
                    <TableHead className="text-muted-foreground font-medium">URL</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Проверка</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Интервал</TableHead>
                    <TableHead className="text-muted-foreground font-medium">Статус</TableHead>
                    <TableHead className="text-right text-muted-foreground font-medium">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPages.map((page) => (
                    <TableRow key={page.id} className="border-border/40 hover:bg-muted/70 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-muted/40 flex items-center justify-center">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          </div>
                          {page.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-light">{page.url}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {CHECK_LABELS[page.checkType || "http"] ?? page.checkType}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground font-light">
                          <Clock className="h-4 w-4" />
                          {page.interval} мин
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${page.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                          {page.isActive && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                          {page.isActive ? "Активен" : "На паузе"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild className="hover:bg-muted hover:text-foreground text-muted-foreground">
                            <Link href={`/dashboard/projects/${data.project.id}/pages/${page.id}`}>
                              <Activity className="h-4 w-4 mr-2" />
                              Графики
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border text-foreground">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setEditPage(pageToEditState(page));
                                  setIsEditDialogOpen(true);
                                }}
                                className="focus:bg-muted focus:text-foreground cursor-pointer"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Редактировать
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleTogglePageStatus(page)}
                                className="focus:bg-muted focus:text-foreground cursor-pointer"
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
                              <DropdownMenuSeparator className="bg-muted" />
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
              <div className="flex flex-col gap-3 border-t border-border/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                <p className="text-sm text-muted-foreground tabular-nums">
                  Показано{" "}
                  {(pagesSafePage - 1) * pagesPageSize + 1}
                  {"–"}
                  {Math.min(pagesSafePage * pagesPageSize, pagesTotalFiltered)} из {pagesTotalFiltered}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 border-border"
                    disabled={pagesSafePage <= 1}
                    onClick={() => setPagesPage(pagesSafePage - 1)}
                    aria-label="Предыдущая страница"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[5rem] text-center text-sm text-muted-foreground tabular-nums">
                    {pagesSafePage} / {pagesTotalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 border-border"
                    disabled={pagesSafePage >= pagesTotalPages}
                    onClick={() => setPagesPage(pagesSafePage + 1)}
                    aria-label="Следующая страница"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-medium">Редактировать страницу</DialogTitle>
          </DialogHeader>
          {editPage && (
            <form onSubmit={handleUpdatePage} className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Название</label>
                <Input
                  placeholder="Например: Главная страница"
                  value={editPage.name}
                  onChange={(e) => setEditPage({ ...editPage, name: e.target.value })}
                  className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">URL</label>
                <Input
                  type="url"
                  placeholder="https://example.com"
                  value={editPage.url}
                  onChange={(e) => setEditPage({ ...editPage, url: e.target.value })}
                  className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Тип проверки</label>
                <select
                  value={editPage.checkType}
                  onChange={(e) => setEditPage({ ...editPage, checkType: e.target.value })}
                  className="flex h-12 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value="http">HTTP — ответ 2xx</option>
                  <option value="keyword">Текст на странице (ключевое слово)</option>
                  <option value="ssl_expiry">Срок действия SSL</option>
                </select>
              </div>
              {editPage.checkType === "keyword" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Подстрока в HTML</label>
                    <Input
                      placeholder="Например: OK или уникальный фрагмент HTML"
                      value={editPage.keyword}
                      onChange={(e) => setEditPage({ ...editPage, keyword: e.target.value })}
                      className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-border accent-primary"
                      checked={editPage.caseSensitive}
                      onChange={(e) => setEditPage({ ...editPage, caseSensitive: e.target.checked })}
                    />
                    Учитывать регистр
                  </label>
                </>
              ) : null}
              {editPage.checkType === "ssl_expiry" ? (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Минимум дней до истечения</label>
                  <Input
                    type="number"
                    min={0}
                    max={3650}
                    value={editPage.warnDays}
                    onChange={(e) => setEditPage({ ...editPage, warnDays: Number(e.target.value) })}
                    className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Интервал проверки (минуты)</label>
                <select
                  value={editPage.interval}
                  onChange={(e) => setEditPage({ ...editPage, interval: Number(e.target.value) })}
                  className="flex h-12 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
                >
                  <option value={1}>1 минута</option>
                  <option value={5}>5 минут</option>
                  <option value={15}>15 минут</option>
                  <option value={60}>60 минут</option>
                </select>
              </div>
              <Button type="submit" className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium" disabled={isPageUpdating}>
                {isPageUpdating ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
