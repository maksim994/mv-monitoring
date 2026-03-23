"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Gauge, Activity, Server, Zap } from "lucide-react";
import Link from "next/link";

export default function PerformanceToolPage() {
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
      const res = await fetch(`/api/tools/performance?url=${encodeURIComponent(url)}`);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
              <Gauge className="h-4 w-4 text-white" />
            </div>
            Performance
          </h1>
          <p className="text-zinc-400 font-light">
            Анализ скорости загрузки страницы и сетевых метрик (TTFB, DNS, TLS)
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
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-white/10 bg-black p-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Статус</span>
                  </div>
                  <div className="text-2xl font-medium text-white">
                    {result.statusCode}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black p-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Zap className="h-4 w-4" />
                    <span className="text-sm">TTFB</span>
                  </div>
                  <div className={`text-2xl font-medium ${result.timings.ttfb < 200 ? 'text-emerald-500' : result.timings.ttfb < 600 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {result.timings.ttfb} <span className="text-sm text-zinc-500">мс</span>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black p-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Server className="h-4 w-4" />
                    <span className="text-sm">Размер</span>
                  </div>
                  <div className="text-2xl font-medium text-white">
                    {formatBytes(result.downloadSize)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black p-4">
                  <div className="flex items-center gap-2 text-zinc-400 mb-2">
                    <Gauge className="h-4 w-4" />
                    <span className="text-sm">Время</span>
                  </div>
                  <div className="text-2xl font-medium text-white">
                    {result.timings.total} <span className="text-sm text-zinc-500">мс</span>
                  </div>
                </div>
              </div>

              {/* Waterfall */}
              <div className="rounded-xl border border-white/10 bg-black overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h3 className="font-medium text-white">Waterfall</h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {[
                      { label: "DNS Lookup", value: result.timings.dnsLookup, color: "bg-blue-500" },
                      { label: "TCP Connect", value: result.timings.tcpConnect, color: "bg-orange-500" },
                      { label: "TLS Handshake", value: result.timings.tlsHandshake, color: "bg-purple-500" },
                      { label: "TTFB", value: result.timings.ttfb, color: "bg-emerald-500" },
                      { label: "Content Transfer", value: result.timings.contentTransfer, color: "bg-cyan-500" }
                    ].map((item, index, arr) => {
                      const total = result.timings.total || 1;
                      const width = Math.max((item.value / total) * 100, 1);
                      
                      // Calculate offset based on previous items
                      let offset = 0;
                      for (let i = 0; i < index; i++) {
                        offset += arr[i].value;
                      }
                      const offsetPercent = (offset / total) * 100;

                      return (
                        <div key={item.label} className="flex items-center gap-4 text-sm">
                          <div className="w-32 text-zinc-400 shrink-0">{item.label}</div>
                          <div className="flex-1 h-4 bg-white/5 rounded-full overflow-hidden relative">
                            <div 
                              className={`absolute h-full ${item.color} rounded-full transition-all duration-500`}
                              style={{ 
                                left: `${offsetPercent}%`,
                                width: `${width}%`,
                                minWidth: '4px'
                              }}
                            />
                          </div>
                          <div className="w-16 text-right text-white font-mono shrink-0">
                            {item.value} мс
                          </div>
                        </div>
                      );
                    })}
                    
                    <div className="pt-4 mt-4 border-t border-white/5 flex items-center gap-4 text-sm font-medium">
                      <div className="w-32 text-white shrink-0">Total Time</div>
                      <div className="flex-1" />
                      <div className="w-16 text-right text-white font-mono shrink-0">
                        {result.timings.total} мс
                      </div>
                    </div>
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
