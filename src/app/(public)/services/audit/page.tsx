"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, SearchCode, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function WebsiteAuditPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/tools/audit?url=${encodeURIComponent(url)}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setResult(data.result);
    } catch (err: any) {
      setError(err.message || "Произошла ошибка при выполнении запроса");
    } finally {
      setIsLoading(false);
    }
  };

  const StatusIcon = ({ ok, warn = false }: { ok: boolean, warn?: boolean }) => {
    if (ok) return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
    if (warn) return <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />;
    return <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
  };

  return (
    <div className="container mx-auto py-12 px-6 max-w-4xl">
      <Link href="/services" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к сервисам
      </Link>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="p-8 border-b border-border/40">
          <h1 className="text-2xl font-medium flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <SearchCode className="h-4 w-4 text-foreground" />
            </div>
            Website Audit
          </h1>
          <p className="text-muted-foreground font-light">
            Быстрая проверка базового SEO: robots.txt, sitemap.xml и мета-тегов
          </p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1">
              <Label htmlFor="url" className="sr-only">URL страницы</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading} className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              {isLoading ? "Анализ..." : "Анализировать"}
            </Button>
          </form>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-4 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-6">
              
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Robots.txt */}
                <div className={`rounded-xl border p-5 ${result.robots.found ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <div className="flex items-start gap-3">
                    <StatusIcon ok={result.robots.found} />
                    <div>
                      <h3 className="font-medium text-foreground mb-1">robots.txt</h3>
                      {result.robots.found ? (
                        <p className="text-sm text-muted-foreground">Файл найден. {result.robots.hasSitemap ? "Содержит ссылку на Sitemap." : "Ссылка на Sitemap отсутствует."}</p>
                      ) : (
                        <p className="text-sm text-red-400">Файл не найден. Поисковики могут индексировать лишнее.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sitemap */}
                <div className={`rounded-xl border p-5 ${result.sitemap.found ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                  <div className="flex items-start gap-3">
                    <StatusIcon ok={result.sitemap.found} warn={!result.sitemap.found} />
                    <div className="overflow-hidden">
                      <h3 className="font-medium text-foreground mb-1">sitemap.xml</h3>
                      {result.sitemap.found ? (
                        <p className="text-sm text-muted-foreground truncate" title={result.sitemap.url}>
                          Найден: {result.sitemap.url}
                        </p>
                      ) : (
                        <p className="text-sm text-yellow-400">Карта сайта не найдена по стандартным путям.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Meta Tags */}
              <div className="rounded-xl border border-border bg-muted overflow-hidden">
                <div className="p-4 border-b border-border/40">
                  <h3 className="font-medium text-foreground">Мета-теги страницы</h3>
                </div>
                <div className="p-0">
                  <table className="w-full text-sm text-left">
                    <tbody className="divide-y divide-border/40">
                      <tr className="hover:bg-muted/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-muted-foreground w-1/3">Title</td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <StatusIcon ok={!!result.meta.title} />
                            <span className="text-foreground">{result.meta.title || "Отсутствует"}</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-muted-foreground">Description</td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <StatusIcon ok={!!result.meta.description} />
                            <span className="text-foreground">{result.meta.description || "Отсутствует"}</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-muted-foreground">Canonical URL</td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <StatusIcon ok={!!result.meta.canonical} warn={!result.meta.canonical} />
                            <span className="text-foreground break-all">{result.meta.canonical || "Отсутствует"}</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-muted-foreground">Viewport</td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <StatusIcon ok={!!result.meta.viewport} />
                            <span className="text-foreground">{result.meta.viewport || "Отсутствует"}</span>
                          </div>
                        </td>
                      </tr>
                      <tr className="hover:bg-muted/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-muted-foreground">Количество H1</td>
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2">
                            <StatusIcon ok={result.meta.h1Count === 1} warn={result.meta.h1Count > 1} />
                            <span className="text-foreground">
                              {result.meta.h1Count === 0 ? "Отсутствует" : result.meta.h1Count}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
