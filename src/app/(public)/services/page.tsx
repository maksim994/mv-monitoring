import { Metadata } from "next";
import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Search, Lock, Activity, Mail, SearchCode, Gauge, ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Сервисы | MV Monitor",
  description: "Сетевые утилиты для проверки доменов и IP",
};

export default function ServicesPage() {
  return (
    <div className="container mx-auto py-20 px-6">
      <div className="mb-12 max-w-2xl">
        <h1 className="text-4xl font-medium tracking-tight mb-4">Сетевые сервисы</h1>
        <p className="text-zinc-400 text-lg font-light">Бесплатные инструменты для диагностики сети и доменов без ограничений.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/services/dig" className="group">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Search className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">Dig (DNS Lookup)</h3>
            <p className="text-zinc-400 font-light leading-relaxed">
              Проверка DNS-записей домена (A, MX, TXT и др.) в реальном времени.
            </p>
          </div>
        </Link>

        <Link href="/services/whois" className="group">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">Whois</h3>
            <p className="text-zinc-400 font-light leading-relaxed">
              Информация о регистрации домена (полная поддержка кириллических зон .рф).
            </p>
          </div>
        </Link>

        <Link href="/services/ssl" className="group">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">SSL Checker</h3>
            <p className="text-zinc-400 font-light leading-relaxed">
              Проверка срока действия, статуса и издателя SSL-сертификата сайта.
            </p>
          </div>
        </Link>

        <Link href="/services/http" className="group">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">HTTP Inspector</h3>
            <p className="text-zinc-400 font-light leading-relaxed">
              Анализ HTTP-ответов, заголовков, цепочек редиректов и таймингов.
            </p>
          </div>
        </Link>

        <Link href="/services/email" className="group">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Mail className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">Email Toolkit</h3>
            <p className="text-zinc-400 font-light leading-relaxed">
              Анализ почтовых записей домена: SPF, DKIM, DMARC и доступность SMTP.
            </p>
          </div>
        </Link>

        <Link href="/services/audit" className="group">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <SearchCode className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">Website Audit</h3>
            <p className="text-zinc-400 font-light leading-relaxed">
              Быстрая проверка базового SEO: robots.txt, sitemap.xml и мета-тегов.
            </p>
          </div>
        </Link>

        <Link href="/services/performance" className="group">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <Gauge className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">Performance</h3>
            <p className="text-zinc-400 font-light leading-relaxed">
              Анализ скорости загрузки страницы и сетевых метрик (TTFB, DNS, TLS).
            </p>
          </div>
        </Link>

        <Link href="/services/security" className="group">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-6 h-full group-hover:bg-[#151515] group-hover:border-white/20 transition-all">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
              <ShieldAlert className="h-5 w-5 text-white" />
            </div>
            <h3 className="text-xl font-medium mb-2">Security Scan</h3>
            <p className="text-zinc-400 font-light leading-relaxed">
              Быстрая проверка на распространенные уязвимости: открытые .env, .git, Directory Listing.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
