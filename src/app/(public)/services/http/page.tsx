"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Activity, Globe, Server, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HttpInspectorPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    let cleanUrl = url.trim();
    try {
      cleanUrl = cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
      new URL(cleanUrl);
    } catch (e) {
      // Ignore
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/http-inspector?url=${encodeURIComponent(cleanUrl)}`);
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

  const getStatusColor = (code: number) => {
    if (code >= 200 && code < 300) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (code >= 300 && code < 400) return "text-blue-500 bg-blue-500/10 border-blue-500/20";
    if (code >= 400 && code < 500) return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
    return "text-red-500 bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="container mx-auto py-12 px-6 max-w-4xl">
      <Link href="/services" className="inline-flex items-center text-sm text-zinc-500 hover:text-white mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Назад к сервисам
      </Link>

      <div className="rounded-2xl border border-white/10 bg-[#111] overflow-hidden">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-medium flex items-center gap-3 mb-2">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </div>
            HTTP Inspector
          </h1>
          <p className="text-zinc-400 font-light">
            Анализ HTTP-ответов, заголовков, цепочек редиректов и таймингов
          </p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1">
              <Label htmlFor="url" className="sr-only">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                required
              />
            </div>
            <Button type="submit" disabled={isLoading} className="h-12 px-8 bg-white text-black hover:bg-zinc-200 font-medium">
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
              {/* Сводка */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl bg-black border border-white/5 p-4">
                  <div className="text-xs text-zinc-500 mb-1">Статус</div>
                  <div className={`inline-flex px-2 py-0.5 rounded text-sm font-medium border ${getStatusColor(result.statusCode)}`}>
                    {result.statusCode}
                  </div>
                </div>
                <div className="rounded-xl bg-black border border-white/5 p-4">
                  <div className="text-xs text-zinc-500 mb-1">Протокол</div>
                  <div className="text-sm font-medium text-white">
                    {result.httpVersion === "3" ? "HTTP/3" : result.httpVersion === "2" ? "HTTP/2" : `HTTP/${result.httpVersion}`}
                  </div>
                </div>
                <div className="rounded-xl bg-black border border-white/5 p-4">
                  <div className="text-xs text-zinc-500 mb-1">IP Адрес</div>
                  <div className="text-sm font-medium text-white">{result.ip}</div>
                </div>
                <div className="rounded-xl bg-black border border-white/5 p-4">
                  <div className="text-xs text-zinc-500 mb-1">Сжатие</div>
                  <div className="text-sm font-medium text-white">{result.compression}</div>
                </div>
              </div>

              {/* Тайминги */}
              <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-zinc-400" />
                  <h3 className="font-medium">Тайминги (Waterfall)</h3>
                  <span className="ml-auto text-sm text-zinc-500">Всего: {result.timings.total} мс</span>
                </div>
                <div className="p-4 space-y-3">
                  {[
                    { label: "DNS Lookup", value: result.timings.dnsLookup, color: "bg-blue-500" },
                    { label: "TCP Connect", value: result.timings.tcpConnect, color: "bg-orange-500" },
                    { label: "TLS Handshake", value: result.timings.tlsHandshake, color: "bg-purple-500" },
                    { label: "TTFB (Ожидание)", value: result.timings.ttfb, color: "bg-emerald-500" },
                    { label: "Загрузка контента", value: result.timings.contentTransfer, color: "bg-cyan-500" },
                  ].map((timing, i) => (
                    <div key={i} className="flex items-center gap-4 text-sm">
                      <div className="w-32 text-zinc-400 shrink-0">{timing.label}</div>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full ${timing.color}`} 
                          style={{ width: `${Math.max((timing.value / result.timings.total) * 100, 1)}%` }}
                        />
                      </div>
                      <div className="w-16 text-right font-mono text-white shrink-0">{timing.value} мс</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Цепочка редиректов */}
              {result.redirects.length > 1 && (
                <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-zinc-400" />
                    <h3 className="font-medium">Цепочка редиректов</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {result.redirects.map((redirect: any, i: number) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(redirect.statusCode)}`}>
                          {redirect.statusCode}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white mb-1">
                            {i === 0 ? "Начальный запрос" : `Редирект ${i}`}
                          </div>
                          {redirect.headers.location && (
                            <div className="text-xs text-zinc-400 break-all">
                              <span className="text-zinc-500">Location:</span> {redirect.headers.location}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Заголовки */}
              <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center gap-2">
                  <Server className="h-4 w-4 text-zinc-400" />
                  <h3 className="font-medium">Заголовки ответа (Финальные)</h3>
                </div>
                <div className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <tbody className="divide-y divide-white/5">
                        {Object.entries(result.finalHeaders).map(([key, value]: [string, any]) => (
                          <tr key={key} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-2 font-medium text-zinc-400 w-1/3 align-top">{key}</td>
                            <td className="px-4 py-2 text-white font-mono text-xs break-all">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
