import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Globe, ShieldCheck, Terminal, Zap, BarChart3 } from "lucide-react";

export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-500/20 to-transparent blur-3xl rounded-full"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-[800px]">
            <h1 className="text-[3.5rem] leading-[1.1] md:text-[5.5rem] md:leading-[1.05] font-medium tracking-tighter text-white mb-6">
              Мы создаем <br className="hidden md:block" />
              <span className="text-zinc-500">надежный мониторинг</span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed tracking-tight font-light mb-10">
              Высокопроизводительная инфраструктура для проверки доступности ваших сайтов. Встроенные сетевые утилиты, точные графики и мгновенные уведомления.
            </p>
            
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Button asChild size="lg" className="h-12 rounded-full px-8 bg-white text-black hover:bg-zinc-200 text-sm font-medium">
                <Link href="/register">
                  Начать бесплатно
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-8 border-white/10 bg-white/5 text-white hover:bg-white/10 text-sm font-medium backdrop-blur-sm">
                <Link href="/services">
                  Сетевые утилиты <ArrowRight className="ml-2 h-4 w-4 opacity-50" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Terminal/Preview Section */}
      <section className="pb-32">
        <div className="container mx-auto px-6">
          <div className="rounded-2xl border border-white/10 bg-[#111] p-2 shadow-2xl overflow-hidden">
            <div className="rounded-xl border border-white/5 bg-black overflow-hidden flex flex-col md:flex-row">
              {/* Mockup Sidebar */}
              <div className="w-full md:w-64 border-r border-white/5 bg-[#0a0a0a] p-4 hidden md:block">
                <div className="flex gap-2 mb-8">
                  <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                  <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                  <div className="w-3 h-3 rounded-full bg-zinc-800"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-6 w-full rounded bg-white/5"></div>
                  <div className="h-6 w-3/4 rounded bg-white/5"></div>
                  <div className="h-6 w-5/6 rounded bg-white/5"></div>
                </div>
              </div>
              {/* Mockup Content */}
              <div className="flex-1 p-6 md:p-10">
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                  <div>
                    <div className="text-sm text-zinc-500 mb-1">Проект</div>
                    <div className="text-lg font-medium">example.com</div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    All systems operational
                  </div>
                </div>
                
                <div className="space-y-4 font-mono text-sm">
                  <div className="flex justify-between items-center text-zinc-400 border-b border-white/5 pb-2">
                    <span>GET /api/health</span>
                    <span className="text-emerald-500">200 OK</span>
                    <span>42ms</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400 border-b border-white/5 pb-2">
                    <span>GET /</span>
                    <span className="text-emerald-500">200 OK</span>
                    <span>128ms</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400 border-b border-white/5 pb-2">
                    <span>DNS Lookup (A)</span>
                    <span className="text-zinc-300">Resolved</span>
                    <span>12ms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 border-t border-white/10 bg-[#0a0a0a]">
        <div className="container mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
              Создано для эффективности
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl font-light">
              Инструменты, разработанные для того, чтобы помочь вам создавать, тестировать и доставлять проекты с максимальной уверенностью.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Feature 1 */}
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#111] p-8 hover:bg-[#151515] transition-colors">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Быстрые проверки (Workers)</h3>
              <p className="text-zinc-400 font-light leading-relaxed max-w-md">
                Изолированные фоновые воркеры на базе BullMQ и Redis обеспечивают точные проверки ваших сайтов каждую минуту без задержек.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-2xl border border-white/10 bg-[#111] p-8 hover:bg-[#151515] transition-colors">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Аналитика</h3>
              <p className="text-zinc-400 font-light leading-relaxed">
                Понятные графики времени ответа и доступности (Uptime) за последние 24 часа.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-2xl border border-white/10 bg-[#111] p-8 hover:bg-[#151515] transition-colors">
              <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                <Terminal className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-xl font-medium mb-3">Dig & Whois</h3>
              <p className="text-zinc-400 font-light leading-relaxed">
                Встроенные сетевые утилиты с поддержкой кириллических доменов (.рф) прямо из коробки.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-[#111] p-8 hover:bg-[#151515] transition-colors overflow-hidden relative">
              <div className="relative z-10">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-6">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-medium mb-3">Создано для Enterprise</h3>
                <p className="text-zinc-400 font-light leading-relaxed max-w-md">
                  Надежная архитектура на базе PostgreSQL и Drizzle ORM. Безопасная авторизация и управление проектами.
                </p>
              </div>
              {/* Decorative background element */}
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-1/4 translate-y-1/4">
                <ShieldCheck className="w-64 h-64" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
