"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/plans", label: "Тарифы" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/metrics", label: "Метрики" },
  { href: "/admin/support", label: "Поддержка" },
  { href: "/admin/marketing", label: "Тексты сайта" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 md:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-nav"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium tracking-tight">Админка</span>
      </header>

      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-label="Закрыть меню"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="admin-nav"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,100vw)] shrink-0 flex-col border-r border-border bg-background p-4 shadow-lg transition-transform duration-200 ease-out md:static md:w-56 md:max-w-none md:translate-x-0 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-2 md:mb-4 md:block">
          <p className="px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Админка</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2.5 text-sm transition-colors",
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="mt-auto rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            ← В кабинет
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-10">{children}</main>
    </div>
  );
}
