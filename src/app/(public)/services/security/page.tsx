"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ShieldAlert, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function SecurityScanPage() {
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
      const res = await fetch(`/api/tools/security?url=${encodeURIComponent(url)}`);
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

  const StatusIcon = ({ vulnerable, checked }: { vulnerable: boolean, checked: boolean }) => {
    if (!checked) return <AlertTriangle className="h-5 w-5 text-zinc-500 shrink-0" />;
    if (vulnerable) return <XCircle className="h-5 w-5 text-red-500 shrink-0" />;
    return <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />;
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
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            Security Quick Scan
          </h1>
          <p className="text-zinc-400 font-light">
            Быстрая проверка на распространенные уязвимости: открытые .env, .git, Directory Listing и CORS
          </p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1">
              <Label htmlFor="url" className="sr-only">URL сайта</Label>
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
              {isLoading ? "Сканирование..." : "Сканировать"}
            </Button>
          </form>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-4 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4">
              
              {/* ENV Check */}
              <div className={`rounded-xl border p-5 ${result.env.vulnerable ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon vulnerable={result.env.vulnerable} checked={result.env.checked} />
                  <div>
                    <h3 className="font-medium text-white mb-1">Открытый .env файл</h3>
                    {result.env.vulnerable ? (
                      <p className="text-sm text-red-400 font-medium">КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: {result.env.details}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">Файл .env не доступен публично (Безопасно).</p>
                    )}
                  </div>
                </div>
              </div>

              {/* GIT Check */}
              <div className={`rounded-xl border p-5 ${result.git.vulnerable ? 'bg-red-500/5 border-red-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon vulnerable={result.git.vulnerable} checked={result.git.checked} />
                  <div>
                    <h3 className="font-medium text-white mb-1">Открытая директория .git</h3>
                    {result.git.vulnerable ? (
                      <p className="text-sm text-red-400 font-medium">КРИТИЧЕСКАЯ УЯЗВИМОСТЬ: {result.git.details}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">Директория .git не доступна публично (Безопасно).</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Directory Listing */}
              <div className={`rounded-xl border p-5 ${result.dirListing.vulnerable ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon vulnerable={result.dirListing.vulnerable} checked={result.dirListing.checked} />
                  <div>
                    <h3 className="font-medium text-white mb-1">Directory Listing</h3>
                    {result.dirListing.vulnerable ? (
                      <p className="text-sm text-yellow-400 font-medium">ПРЕДУПРЕЖДЕНИЕ: {result.dirListing.details}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">Просмотр директорий отключен (Безопасно).</p>
                    )}
                  </div>
                </div>
              </div>

              {/* CORS */}
              <div className={`rounded-xl border p-5 ${result.cors.vulnerable ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon vulnerable={result.cors.vulnerable} checked={result.cors.checked} />
                  <div>
                    <h3 className="font-medium text-white mb-1">CORS Misconfiguration</h3>
                    {result.cors.vulnerable ? (
                      <p className="text-sm text-yellow-400 font-medium">ПРЕДУПРЕЖДЕНИЕ: {result.cors.details}</p>
                    ) : (
                      <p className="text-sm text-zinc-400">Заголовок Access-Control-Allow-Origin настроен безопасно.</p>
                    )}
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
