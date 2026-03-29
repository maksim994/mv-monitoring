"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function SSLPage() {
  const [domain, setDomain] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;

    let cleanDomain = domain.trim();
    try {
      const urlString = cleanDomain.startsWith('http') ? cleanDomain : `https://${cleanDomain}`;
      const url = new URL(urlString);
      cleanDomain = url.hostname;
    } catch (e) {
      // Ignore
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/ssl?domain=${encodeURIComponent(cleanDomain)}`);
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
              <Lock className="h-4 w-4 text-foreground" />
            </div>
            Проверка SSL сертификата
          </h1>
          <p className="text-muted-foreground font-light">
            Узнайте срок действия, кем выдан и статус SSL сертификата для любого домена
          </p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-4 mb-8">
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
            <Button type="submit" disabled={isLoading} className="h-12 px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
              {isLoading ? "Проверка..." : "Проверить"}
            </Button>
          </form>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-4 text-sm">
              {error}
            </div>
          )}

          {result !== null && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border flex items-start gap-4 ${result.isValid ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                {result.isValid ? (
                  <ShieldCheck className="h-6 w-6 text-emerald-500 shrink-0" />
                ) : (
                  <ShieldAlert className="h-6 w-6 text-red-500 shrink-0" />
                )}
                <div>
                  <h3 className={`font-medium ${result.isValid ? 'text-emerald-500' : 'text-red-500'}`}>
                    {result.isValid ? "Сертификат действителен" : "Сертификат недействителен или имеет проблемы"}
                  </h3>
                  {!result.isValid && result.authorizationError && (
                    <p className="text-sm text-red-400 mt-1">{result.authorizationError}</p>
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-muted border border-border/40 p-6">
                  <div className="text-sm text-muted-foreground mb-1">Осталось дней</div>
                  <div className={`text-3xl font-medium ${result.daysRemaining < 14 ? 'text-red-500' : result.daysRemaining < 30 ? 'text-yellow-500' : 'text-foreground'}`}>
                    {result.daysRemaining}
                  </div>
                </div>
                <div className="rounded-xl bg-muted border border-border/40 p-6">
                  <div className="text-sm text-muted-foreground mb-1">Кем выдан (Issuer)</div>
                  <div className="text-lg font-medium text-foreground truncate" title={result.issuer.O || result.issuer.CN}>
                    {result.issuer.O || result.issuer.CN || "Неизвестно"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-muted border border-border/40 p-6 space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Действителен с</div>
                  <div className="text-foreground">{new Date(result.validFrom).toLocaleString("ru-RU")}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Действителен до</div>
                  <div className="text-foreground">{new Date(result.validTo).toLocaleString("ru-RU")}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Субъект (Subject)</div>
                  <div className="text-foreground font-mono text-sm">{result.subject.CN}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Отпечаток (Fingerprint)</div>
                  <div className="text-foreground font-mono text-sm break-all">{result.fingerprint}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
