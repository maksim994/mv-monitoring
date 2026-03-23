"use client";

import { useState, useEffect } from "react";
import { Folder, Lock, Globe, ShieldAlert, AlertCircle } from "lucide-react";
import Link from "next/link";

export function ProjectCard({ project }: { project: any }) {
  const [sslInfo, setSslInfo] = useState<any>(null);
  const [whoisInfo, setWhoisInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const domainToUse = project.domain || (project.name.includes('.') ? project.name : null);

  useEffect(() => {
    if (!domainToUse) return;

    const fetchInfo = async () => {
      setIsLoading(true);
      try {
        // Fetch SSL
        const sslRes = await fetch(`/api/ssl?domain=${encodeURIComponent(domainToUse)}`);
        if (sslRes.ok) {
          const sslData = await sslRes.json();
          setSslInfo(sslData.result);
        }

        // Fetch Whois (Optional: we can parse the raw text to find expiration date)
        const whoisRes = await fetch(`/api/whois?domain=${encodeURIComponent(domainToUse)}`);
        if (whoisRes.ok) {
          const whoisData = await whoisRes.json();
          const rawText = whoisData.result;
          
          // Try to extract expiration date using common patterns
          const match = rawText.match(/(?:Registry Expiry Date|paid-till|Expiration Date|Expiry Date|free-date):\s*([^\n\r]+)/i);
          if (match && match[1]) {
            setWhoisInfo({ expiresAt: match[1].trim() });
          } else {
            setWhoisInfo({ expiresAt: "Неизвестно" });
          }
        }
      } catch (e) {
        console.error("Failed to fetch project domain info", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInfo();
  }, [domainToUse]);

  return (
    <Link href={`/dashboard/projects/${project.id}`} className="group block h-full">
      <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full flex flex-col group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
            <Folder className="h-5 w-5 text-white" />
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xl font-medium text-white truncate">{project.name}</h3>
            {project.domain && (
              <p className="text-sm text-zinc-500 truncate">{project.domain}</p>
            )}
          </div>
        </div>
        
        <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
          {!domainToUse ? (
            <p className="text-sm text-zinc-500 font-light">
              Домен не указан. Добавьте домен для мониторинга SSL и Whois.
            </p>
          ) : isLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 w-3/4 bg-white/5 rounded"></div>
              <div className="h-4 w-1/2 bg-white/5 rounded"></div>
            </div>
          ) : (
            <>
              {sslInfo && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Lock className="h-4 w-4" />
                    <span>SSL до:</span>
                  </div>
                  <span className={`font-medium ${sslInfo.daysRemaining < 14 ? 'text-red-500' : sslInfo.daysRemaining < 30 ? 'text-yellow-500' : 'text-emerald-500'}`}>
                    {new Date(sslInfo.validTo).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              )}
              {whoisInfo && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Globe className="h-4 w-4" />
                    <span>Домен до:</span>
                  </div>
                  <span className="font-medium text-white truncate max-w-[120px] text-right" title={whoisInfo.expiresAt}>
                    {whoisInfo.expiresAt.split('T')[0]}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
