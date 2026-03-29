"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, FolderKanban, LogOut, Menu, Settings, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail: string | null;
  userName: string | null;
  showAdminLink: boolean;
};

function navActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/projects");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardShell({
  children,
  userEmail,
  userName,
  showAdminLink,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const initial =
    userEmail?.[0]?.toUpperCase() ?? userName?.[0]?.toUpperCase() ?? "?";

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

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
        <Activity className="h-4 w-4" strokeWidth={3} />
      </div>
      <span className="text-sm font-semibold tracking-wide">MV Monitor</span>
    </div>
  );

  const navLinks = (
    <>
      <Link
        href="/dashboard"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          navActive(pathname, "/dashboard")
            ? "bg-muted/60 text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={() => setOpen(false)}
      >
        <FolderKanban className="h-5 w-5 shrink-0" />
        Проекты
      </Link>
      <Link
        href="/dashboard/settings"
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
          navActive(pathname, "/dashboard/settings")
            ? "bg-muted/60 text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        onClick={() => setOpen(false)}
      >
        <Settings className="h-5 w-5 shrink-0" />
        Настройки
      </Link>
      {showAdminLink ? (
        <Link
          href="/admin"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
            pathname.startsWith("/admin")
              ? "bg-muted/60 text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          onClick={() => setOpen(false)}
        >
          <Shield className="h-5 w-5 shrink-0" />
          Админка
        </Link>
      ) : null}
    </>
  );

  const userBlock = (
    <div className="border-t border-border pt-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
          {initial}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium">{userName || "Пользователь"}</p>
          <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
        </div>
      </div>
      <Link
        href="/api/auth/signout"
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
        onClick={() => setOpen(false)}
      >
        <LogOut className="h-5 w-5 shrink-0" />
        Выйти
      </Link>
    </div>
  );

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
          aria-controls="dashboard-nav"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {brand}
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
        id="dashboard-nav"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(20rem,100vw)] shrink-0 flex-col border-r border-border bg-card p-6 shadow-lg transition-transform duration-200 ease-out md:static md:w-64 md:max-w-none md:translate-x-0 md:shadow-none",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="mb-6 flex items-start justify-between gap-2 md:mb-8">
          <div className="min-w-0">{brand}</div>
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

        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">{navLinks}</nav>

        <div className="mt-auto shrink-0">{userBlock}</div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">{children}</main>
    </div>
  );
}
