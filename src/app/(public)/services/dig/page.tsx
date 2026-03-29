"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Search, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function DigPage() {
  const [domain, setDomain] = useState("");
  const [type, setType] = useState("ANY");
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;

    // Clean up domain before sending to API
    let cleanDomain = domain.trim();
    try {
      const urlString = cleanDomain.startsWith('http') ? cleanDomain : `http://${cleanDomain}`;
      const url = new URL(urlString);
      cleanDomain = url.hostname;
    } catch (e) {
      // Ignore parsing errors, let API handle validation
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/dig?domain=${encodeURIComponent(cleanDomain)}&type=${type}`);
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
              <Search className="h-4 w-4 text-foreground" />
            </div>
            Утилита Dig
          </h1>
          <p className="text-muted-foreground font-light">
            Выполните DNS-запрос для получения информации о записях домена
          </p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleDig} className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-1">
              <Label htmlFor="domain" className="sr-only">Домен</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="h-12 bg-muted border-border focus-visible:ring-ring/40"
                required
              />
            </div>
            <div className="w-full sm:w-32">
              <Label htmlFor="type" className="sr-only">Тип записи</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="flex h-12 w-full items-center justify-between rounded-md border border-border bg-muted px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="ANY">Все записи (ANY)</option>
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="MX">MX</option>
                <option value="TXT">TXT</option>
                <option value="NS">NS</option>
                <option value="CNAME">CNAME</option>
                <option value="SOA">SOA</option>
              </select>
            </div>
            <Button type="submit" disabled={isLoading} className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              {isLoading ? "Запрос..." : "Проверить"}
            </Button>
          </form>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-4 text-sm">
              {error}
            </div>
          )}

          {result !== null && (
            <div className="relative group">
              <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 bg-card border-border hover:bg-muted hover:text-foreground"
                  onClick={handleCopy}
                  title="Копировать результат"
                >
                  {isCopied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <div className="rounded-xl bg-muted border border-border/40 p-6 overflow-x-auto min-h-[100px]">
                <pre className="text-sm text-foreground/90 font-mono whitespace-pre-wrap leading-relaxed">
                  {result || "Записи не найдены"}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
