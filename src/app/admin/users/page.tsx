"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type U = {
  id: string;
  email: string | null;
  name: string | null;
  planTier: string;
  proValidUntil: string | null;
  banned: boolean;
  role: string;
};

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<U[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const j = (await res.json()) as { users: U[] };
      setUsers(j.users);
    }
    setLoading(false);
  }, [q]);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchUser(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) void load();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-medium tracking-tight">Пользователи</h1>
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск email / id" />
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          Найти
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Тариф</th>
              <th className="p-3">PRO до</th>
              <th className="p-3">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="p-3">
                  <div className="font-medium">{u.email}</div>
                  <div className="text-xs text-muted-foreground">{u.id}</div>
                </td>
                <td className="p-3">
                  {u.planTier}
                  {u.banned ? <span className="ml-2 text-red-500">заблокирован</span> : null}
                </td>
                <td className="p-3 text-muted-foreground">{u.proValidUntil ?? "—"}</td>
                <td className="p-3 space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => void patchUser(u.id, { banned: !u.banned })}
                  >
                    {u.banned ? "Разблок." : "Бан"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() =>
                      void patchUser(u.id, {
                        planTier: "pro",
                        proValidUntil: new Date(Date.now() + 30 * 864e5).toISOString(),
                      })
                    }
                  >
                    +PRO 30д
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    onClick={() => void patchUser(u.id, { planTier: "free", proValidUntil: null })}
                  >
                    Free
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
