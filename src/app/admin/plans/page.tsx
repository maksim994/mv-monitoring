"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = {
  planKey: string;
  maxProjects: number;
  maxPagesPerUser: number;
  minIntervalMinutes: number;
  allowTelegram: boolean;
  allowWebhook: boolean;
  priceRubPerMonth: number;
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/plan-limits");
    if (!res.ok) {
      setErr("Нет доступа или ошибка загрузки");
      setLoading(false);
      return;
    }
    const j = (await res.json()) as { plans: Row[] };
    setPlans(j.plans);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const free = plans.find((p) => p.planKey === "free");
  const pro = plans.find((p) => p.planKey === "pro");

  async function save() {
    if (!free || !pro) return;
    setSaving(true);
    setErr(null);
    const res = await fetch("/api/admin/plan-limits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        free: {
          maxProjects: free.maxProjects,
          maxPagesPerUser: free.maxPagesPerUser,
          minIntervalMinutes: free.minIntervalMinutes,
          allowTelegram: free.allowTelegram,
          allowWebhook: free.allowWebhook,
        },
        pro: {
          maxProjects: pro.maxProjects,
          maxPagesPerUser: pro.maxPagesPerUser,
          minIntervalMinutes: pro.minIntervalMinutes,
          allowTelegram: pro.allowTelegram,
          allowWebhook: pro.allowWebhook,
          priceRubPerMonth: pro.priceRubPerMonth,
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setErr("Не удалось сохранить");
      return;
    }
    const j = (await res.json()) as { plans: Row[] };
    setPlans(j.plans);
  }

  function patchFree(p: Partial<Row>) {
    setPlans((prev) => prev.map((x) => (x.planKey === "free" ? { ...x, ...p } : x)));
  }
  function patchPro(p: Partial<Row>) {
    setPlans((prev) => prev.map((x) => (x.planKey === "pro" ? { ...x, ...p } : x)));
  }

  if (loading || !free || !pro) {
    return <p className="text-sm text-muted-foreground">{loading ? "Загрузка…" : "Нет данных"}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Тарифы</h1>
        <p className="text-sm text-muted-foreground">Лимиты и цена PRO на сайте и в ЮKassa</p>
      </div>
      {err ? <p className="text-sm text-red-500">{err}</p> : null}

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-border p-4">
          <h2 className="font-medium">Free</h2>
          <div className="space-y-2">
            <Label>Макс. проектов</Label>
            <Input
              type="number"
              value={free.maxProjects}
              onChange={(e) => patchFree({ maxProjects: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Макс. мониторов (URL) на пользователя</Label>
            <Input
              type="number"
              value={free.maxPagesPerUser}
              onChange={(e) => patchFree({ maxPagesPerUser: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Мин. интервал (мин)</Label>
            <Input
              type="number"
              value={free.minIntervalMinutes}
              onChange={(e) => patchFree({ minIntervalMinutes: Number(e.target.value) || 1 })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={free.allowTelegram}
              onChange={(e) => patchFree({ allowTelegram: e.target.checked })}
            />
            Telegram
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={free.allowWebhook}
              onChange={(e) => patchFree({ allowWebhook: e.target.checked })}
            />
            Webhook
          </label>
        </div>

        <div className="space-y-4 rounded-xl border border-border p-4">
          <h2 className="font-medium">PRO</h2>
          <div className="space-y-2">
            <Label>Цена ₽ / месяц</Label>
            <Input
              type="number"
              value={pro.priceRubPerMonth}
              onChange={(e) => patchPro({ priceRubPerMonth: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Макс. проектов</Label>
            <Input
              type="number"
              value={pro.maxProjects}
              onChange={(e) => patchPro({ maxProjects: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Макс. мониторов</Label>
            <Input
              type="number"
              value={pro.maxPagesPerUser}
              onChange={(e) => patchPro({ maxPagesPerUser: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-2">
            <Label>Мин. интервал (мин)</Label>
            <Input
              type="number"
              value={pro.minIntervalMinutes}
              onChange={(e) => patchPro({ minIntervalMinutes: Number(e.target.value) || 1 })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pro.allowTelegram}
              onChange={(e) => patchPro({ allowTelegram: e.target.checked })}
            />
            Telegram
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pro.allowWebhook}
              onChange={(e) => patchPro({ allowWebhook: e.target.checked })}
            />
            Webhook
          </label>
        </div>
      </div>

      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "Сохранение…" : "Сохранить"}
      </Button>
    </div>
  );
}
