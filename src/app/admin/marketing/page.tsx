"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Item = { key: string; value: string };

const KEYS = ["home_hero_title", "home_hero_subtitle", "pricing_intro"] as const;

export default function AdminMarketingPage() {
  const [map, setMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/marketing");
    if (res.ok) {
      const j = (await res.json()) as { items: Item[] };
      const m: Record<string, string> = {};
      for (const k of KEYS) m[k] = "";
      for (const it of j.items) m[it.key] = it.value;
      setMap(m);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    const items = KEYS.map((key) => ({ key, value: map[key] ?? "" }));
    await fetch("/api/admin/marketing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    setSaving(false);
    void load();
  }

  if (loading) return <p className="text-sm text-muted-foreground">Загрузка…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-medium tracking-tight">Тексты сайта</h1>
      {KEYS.map((key) => (
        <div key={key} className="space-y-2">
          <Label>{key}</Label>
          <textarea
            value={map[key] ?? ""}
            onChange={(e) => setMap((prev) => ({ ...prev, [key]: e.target.value }))}
            rows={key === "home_hero_title" ? 3 : 4}
            className={cn(
              "w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm font-mono outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            )}
          />
        </div>
      ))}
      <Button onClick={() => void save()} disabled={saving}>
        {saving ? "Сохранение…" : "Сохранить"}
      </Button>
    </div>
  );
}
