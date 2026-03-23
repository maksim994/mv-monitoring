import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-black">
            <Activity className="h-4 w-4" strokeWidth={3} />
          </div>
          <span className="text-sm font-semibold tracking-wide">MV Monitor</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
          <Link href="/services" className="hover:text-white transition-colors">
            Инструменты
          </Link>
          <Link href="/pricing" className="hover:text-white transition-colors">
            Тарифы
          </Link>
          <Link href="/docs" className="hover:text-white transition-colors">
            Документация
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors hidden sm:block">
            Войти
          </Link>
          <Button asChild variant="secondary" className="h-8 rounded-full px-4 text-xs font-medium bg-white text-black hover:bg-zinc-200">
            <Link href="/register">Начать работу</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
