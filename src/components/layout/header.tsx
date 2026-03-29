import Link from "next/link";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
            <Activity className="h-4 w-4" strokeWidth={3} />
          </div>
          <span className="text-sm font-semibold tracking-wide">MV Monitor</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/services" className="hover:text-foreground transition-colors">
            Инструменты
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Тарифы
          </Link>
          <Link href="/legal/offer" className="hover:text-foreground transition-colors">
            Оферта
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            Войти
          </Link>
          <Link
            href="/register"
            className={cn(
              buttonVariants({ variant: "secondary", size: "default" }),
              "h-8 rounded-full px-4 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            Начать работу
          </Link>
        </div>
      </div>
    </header>
  );
}
