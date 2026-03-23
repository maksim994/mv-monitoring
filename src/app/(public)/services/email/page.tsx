"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Info } from "lucide-react";
import Link from "next/link";

export default function EmailToolkitPage() {
  const [domain, setDomain] = useState("");
  const [selector, setSelector] = useState("");
  const [result, setResult] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const query = new URLSearchParams({ domain });
      if (selector) query.append("selector", selector);
      
      const res = await fetch(`/api/tools/email?${query.toString()}`);
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

  const StatusIcon = ({ ok }: { ok: boolean }) => 
    ok ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" /> : <XCircle className="h-5 w-5 text-red-500 shrink-0" />;

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
              <Mail className="h-4 w-4 text-white" />
            </div>
            Email Toolkit
          </h1>
          <p className="text-zinc-400 font-light">
            Анализ почтовых записей домена: SPF, DKIM, DMARC и доступность SMTP
          </p>
        </div>
        
        <div className="p-8">
          <form onSubmit={handleCheck} className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="flex-[2]">
              <Label htmlFor="domain" className="sr-only">Домен</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
                required
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="selector" className="sr-only">DKIM Селектор</Label>
              <Input
                id="selector"
                placeholder="DKIM Selector (опц.)"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                className="h-12 bg-black border-white/10 focus-visible:ring-white/20"
              />
            </div>
            <Button type="submit" disabled={isLoading} className="h-12 px-8 bg-white text-black hover:bg-zinc-200 font-medium">
              {isLoading ? "Проверка..." : "Проверить"}
            </Button>
          </form>

          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 mb-4 text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-6">
              
              {/* SPF */}
              <div className={`rounded-xl border p-6 ${result.spf.found && result.spf.valid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon ok={result.spf.found && result.spf.valid} />
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">SPF (Sender Policy Framework)</h3>
                    {result.spf.found ? (
                      <>
                        <p className="text-sm text-zinc-400 mb-2">Запись найдена:</p>
                        <code className="block p-3 rounded-lg bg-black border border-white/5 text-sm text-zinc-300 break-all">
                          {result.spf.record}
                        </code>
                        {!result.spf.valid && (
                          <p className="text-sm text-red-400 mt-2 flex items-center gap-1">
                            <Info className="h-4 w-4" /> Запись не имеет строгого правила завершения (~all, -all)
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-red-400">SPF запись не найдена. Ваши письма могут попадать в спам.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* DMARC */}
              <div className={`rounded-xl border p-6 ${result.dmarc.found ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon ok={result.dmarc.found} />
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">DMARC</h3>
                    {result.dmarc.found ? (
                      <>
                        <p className="text-sm text-zinc-400 mb-2">Запись найдена (_dmarc.{result.domain}):</p>
                        <code className="block p-3 rounded-lg bg-black border border-white/5 text-sm text-zinc-300 break-all mb-3">
                          {result.dmarc.record}
                        </code>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {Object.entries(result.dmarc.parsed).map(([key, val]) => (
                            <div key={key} className="flex bg-black/50 rounded border border-white/5 p-2">
                              <span className="text-zinc-500 w-12 font-mono">{key}:</span>
                              <span className="text-white font-mono truncate">{val as string}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-red-400">DMARC запись не найдена. Она необходима для защиты от спуфинга.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* DKIM */}
              {result.dkim.checked && (
                <div className={`rounded-xl border p-6 ${result.dkim.found ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                  <div className="flex items-start gap-3">
                    <StatusIcon ok={result.dkim.found} />
                    <div className="flex-1">
                      <h3 className="font-medium text-white mb-1">DKIM (DomainKeys Identified Mail)</h3>
                      {result.dkim.found ? (
                        <>
                          <p className="text-sm text-zinc-400 mb-2">Запись найдена для селектора "{selector}":</p>
                          <code className="block p-3 rounded-lg bg-black border border-white/5 text-sm text-zinc-300 break-all">
                            {result.dkim.record}
                          </code>
                        </>
                      ) : (
                        <p className="text-sm text-yellow-400">DKIM запись не найдена для селектора "{selector}". Проверьте правильность селектора.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* MX & SMTP */}
              <div className={`rounded-xl border p-6 ${result.mx.found ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-start gap-3">
                  <StatusIcon ok={result.mx.found} />
                  <div className="flex-1">
                    <h3 className="font-medium text-white mb-1">MX Записи & SMTP</h3>
                    {result.mx.found ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm text-zinc-400 mb-2">Почтовые серверы:</p>
                          <div className="space-y-2">
                            {result.mx.records.map((mx: any, i: number) => (
                              <div key={i} className="flex items-center justify-between p-2 rounded bg-black border border-white/5 text-sm">
                                <span className="text-white">{mx.exchange}</span>
                                <span className="text-zinc-500">Приоритет: {mx.priority}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-zinc-400 mb-2">Доступность портов (Primary MX):</p>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${result.mx.smtpPorts['25'] ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="text-sm text-zinc-300">Порт 25</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${result.mx.smtpPorts['587'] ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="text-sm text-zinc-300">Порт 587</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-red-400">MX записи не найдены. Домен не может принимать почту.</p>
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
