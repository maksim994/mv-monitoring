"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminSupportPage() {
  const [userId, setUserId] = useState("");
  const [json, setJson] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!userId.trim()) return;
    setLoading(true);
    setJson(null);
    const res = await fetch(`/api/admin/support/${encodeURIComponent(userId.trim())}`);
    setLoading(false);
    if (res.ok) {
      const j = await res.json();
      setJson(JSON.stringify(j, null, 2));
    } else {
      setJson(`Error ${res.status}`);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-medium tracking-tight">Поддержка (read-only)</h1>
      <div className="flex gap-2">
        <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User ID" />
        <Button type="button" onClick={() => void load()} disabled={loading}>
          Загрузить
        </Button>
      </div>
      {json ? (
        <pre className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/30 p-4 text-xs">
          {json}
        </pre>
      ) : null}
    </div>
  );
}
