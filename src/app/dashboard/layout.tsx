import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, FolderKanban, LogOut, Settings } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-[#0a0a0a] text-zinc-50">
      <aside className="w-full md:w-64 border-r border-white/10 bg-[#111] p-6 flex flex-col">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-black">
            <Activity className="h-4 w-4" strokeWidth={3} />
          </div>
          <span className="text-sm font-semibold tracking-wide">MV Monitor</span>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
            <FolderKanban className="h-5 w-5" />
            Проекты
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-400 hover:bg-white/10 hover:text-white transition-colors">
            <Settings className="h-5 w-5" />
            Настройки
          </Link>
        </nav>

        <div className="mt-auto pt-8 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium">
              {session.user.email?.[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{session.user.name || "Пользователь"}</p>
              <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
            </div>
          </div>
          <Link href="/api/auth/signout" className="flex items-center gap-3 rounded-lg px-3 py-2 text-zinc-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut className="h-5 w-5" />
            Выйти
          </Link>
        </div>
      </aside>
      
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
