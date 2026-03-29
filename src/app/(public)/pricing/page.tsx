import Link from "next/link";
import { db } from "@/db";
import { planLimits, siteMarketing } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

export default async function PricingPage() {
  const [freeRow, proRow] = await Promise.all([
    db.query.planLimits.findFirst({ where: eq(planLimits.planKey, "free") }),
    db.query.planLimits.findFirst({ where: eq(planLimits.planKey, "pro") }),
  ]);

  const introRows = await db.query.siteMarketing.findMany({
    where: inArray(siteMarketing.key, ["pricing_intro"]),
  });
  const intro = introRows[0]?.value ?? "Тарифы MV Monitor.";

  if (!freeRow || !proRow) {
    return (
      <div className="container mx-auto px-6 py-24">
        <p className="text-muted-foreground">Тарифы временно недоступны.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-24 max-w-4xl">
      <h1 className="text-4xl font-medium tracking-tight mb-4">Тарифы</h1>
      <p className="text-muted-foreground mb-12 max-w-2xl leading-relaxed">{intro}</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl font-medium mb-2">Free</h2>
          <p className="text-3xl font-medium mb-6">0 ₽</p>
          <ul className="space-y-2 text-sm text-muted-foreground mb-8">
            <li>Проектов: до {freeRow.maxProjects}</li>
            <li>Мониторов (URL): до {freeRow.maxPagesPerUser}</li>
            <li>Интервал проверки: не чаще {freeRow.minIntervalMinutes} мин</li>
            <li>
              Уведомления:{" "}
              {freeRow.allowTelegram ? "email и Telegram" : "только email"}
            </li>
            <li>Webhook: {freeRow.allowWebhook ? "да" : "нет"}</li>
          </ul>
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: "outline" }), "w-full justify-center")}
          >
            Начать бесплатно
          </Link>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-card p-8 ring-1 ring-primary/20">
          <h2 className="text-xl font-medium mb-2">PRO</h2>
          <p className="text-3xl font-medium mb-1">{proRow.priceRubPerMonth} ₽</p>
          <p className="text-sm text-muted-foreground mb-6">в месяц, списание через ЮKassa</p>
          <ul className="space-y-2 text-sm text-muted-foreground mb-8">
            <li>Проектов: до {proRow.maxProjects}</li>
            <li>Мониторов (URL): до {proRow.maxPagesPerUser}</li>
            <li>Мин. интервал: {proRow.minIntervalMinutes} мин</li>
            <li>Telegram: {proRow.allowTelegram ? "да" : "нет"}</li>
            <li>Webhook: {proRow.allowWebhook ? "да" : "нет"}</li>
          </ul>
          <Link
            href="/register"
            className={cn(buttonVariants(), "w-full justify-center bg-primary text-primary-foreground")}
          >
            Зарегистрироваться и оплатить в кабинете
          </Link>
        </div>
      </div>
    </div>
  );
}
