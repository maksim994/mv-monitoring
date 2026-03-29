import Link from "next/link";
import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12 mt-auto">
      <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5" />
          <span className="font-medium">MV Monitor</span>
        </div>
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
            Политика ПДн
          </Link>
          <Link href="/legal/offer" className="hover:text-foreground transition-colors">
            Оферта
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Тарифы
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} MV Monitor. Все права защищены.
        </div>
      </div>
    </footer>
  );
}
