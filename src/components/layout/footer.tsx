import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0a] py-12 mt-auto">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 text-zinc-400">
          <Activity className="h-5 w-5" />
          <span className="font-medium">MV Monitor</span>
        </div>
        <div className="text-sm text-zinc-600">
          © {new Date().getFullYear()} MV Monitor. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
